#!/usr/bin/env python3
"""
Endpoint coverage: what the suites actually reach, against what exists.

Answers "do the suites cover every endpoint?" with evidence rather than
assertion. The API records the matched route pattern for each request it serves
(EndpointCoverageFilter, development profiles only); this compares that
recording against the routes declared in the controllers.

    # start the API with -Dendpoint.coverage.file=/tmp/endpoint-coverage.txt
    python3 scripts/qa/api_smoke.py && python3 scripts/qa/api_deep.py
    (cd apps/web && npx playwright test)
    python3 scripts/qa/endpoint_coverage.py /tmp/endpoint-coverage.txt

Exits non-zero if any endpoint was never reached.
"""
import glob
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CONTROLLERS = os.path.normpath(os.path.join(
    HERE, "..", "..", "apps", "api-kt", "src", "main", "kotlin",
    "com", "assetmanagement", "api", "controller"))

VERB = re.compile(r'@(Get|Post|Put|Patch|Delete)Mapping(?:\(\s*(?:value\s*=\s*)?"([^"]*)")?')
BASE = re.compile(r'@RequestMapping\([^)]*\)', re.S)


def declared():
    """Every (METHOD, pattern) the controllers expose, mapped to its file."""
    out = {}
    for path in sorted(glob.glob(os.path.join(CONTROLLERS, "*.kt"))):
        src = open(path).read()
        m = BASE.search(src)
        bases = re.findall(r'"([^"]+)"', m.group(0)) if m else [""]
        for v in VERB.finditer(src):
            verb, suffix = v.group(1).upper(), (v.group(2) or "")
            for base in bases:
                pattern = (base + suffix) or base
                out.setdefault(f"{verb} {pattern}", os.path.basename(path))
    return out


def reached(path):
    if not os.path.exists(path):
        sys.exit(f"No recording at {path}. Start the API with "
                 f"-Dendpoint.coverage.file={path}, run the suites, then re-run this.")
    with open(path) as fh:
        return {line.strip() for line in fh if line.strip()}


def main():
    recording = sys.argv[1] if len(sys.argv) > 1 else "/tmp/endpoint-coverage.txt"
    have, hit = declared(), reached(recording)

    missed = sorted(k for k in have if k not in hit)
    extra = sorted(k for k in hit if k not in have)

    print(f"declared: {len(have)}   reached: {len(have) - len(missed)}   "
          f"never reached: {len(missed)}")
    if missed:
        print("\nNEVER REACHED BY ANY SUITE:")
        by_file = {}
        for k in missed:
            by_file.setdefault(have[k], []).append(k)
        for f in sorted(by_file):
            print(f"  {f}")
            for k in by_file[f]:
                print(f"      {k}")
    if extra:
        print("\nReached but not declared (aliases, framework or error routes):")
        for k in extra:
            print(f"  {k}")
    return 1 if missed else 0


if __name__ == "__main__":
    sys.exit(main())
