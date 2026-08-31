#!/usr/bin/env python3
"""
Prints the coverage figures with the context that makes them mean something.

A single percentage would mislead in both directions here: the backend's test
JVM alone reports ~27% while the API suites exercise every controller against
the running jar, and the frontend's unit tests deliberately cover only the pure
logic, its screens being covered behaviourally instead.
"""
import glob
import os
import json
import sys
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))


def backend():
    path = os.path.join(ROOT, "apps", "api-kt", "build", "reports", "jacoco",
                        "jacocoRuntimeReport", "jacocoRuntimeReport.xml")
    if not os.path.exists(path):
        print("  backend: no merged report (run the sweep with the agent present)")
        return
    root = ET.parse(path).getroot()
    tot = {c.get("type"): (int(c.get("covered")), int(c.get("missed")))
           for c in root.findall("counter")}
    line = tot.get("LINE")
    branch = tot.get("BRANCH")
    print("  backend — unit + integration tests + the running API:")
    if line:
        print(f"      lines    {line[0]/(line[0]+line[1])*100:5.1f}%  ({line[0]}/{line[0]+line[1]})")
    if branch:
        print(f"      branches {branch[0]/(branch[0]+branch[1])*100:5.1f}%  ({branch[0]}/{branch[0]+branch[1]})")


def frontend():
    path = os.path.join(ROOT, "apps", "web", "coverage", "coverage-summary.json")
    if not os.path.exists(path):
        print("  frontend: no unit coverage report")
        return
    d = json.load(open(path)).get("total", {})
    print("  frontend — unit tests over the pure logic only "
          "(src/lib, src/hooks; screens are covered behaviourally):")
    for k in ("lines", "branches"):
        if k in d:
            print(f"      {k:8} {d[k]['pct']:5.1f}%  ({d[k]['covered']}/{d[k]['total']})")


def main():
    backend()
    frontend()
    print("\n  Behavioural coverage is the meaningful figure for the screens:")
    print("      every endpoint reached by a suite  — scripts/qa/endpoint_coverage.py")
    print("      every control named by a spec      — scripts/qa/gui_coverage.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
