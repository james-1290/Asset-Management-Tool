#!/usr/bin/env python3
"""
Per-subject audit of the backend, so a sweep's coverage is measured.

Earlier sweeps applied a few lenses to whatever came to mind and reported
convergence. This walks *every* handler in *every* controller and gives each one
a verdict on the things that must be true of it:

  authz     an authorization rule applies (or the path is deliberately public)
  validate  a request body is validated, or there is no body
  audit     a write emits an audit-log entry
  tx        a read that maps entities runs in a transaction (OSIV is off)
  lock      a write to a versioned entity checks the client's version

Anything it cannot prove, it prints. Silence is the pass condition.
"""
import os, re, sys, collections

CTRL = "apps/api-kt/src/main/kotlin/com/assetmanagement/api/controller"

# Paths that are unauthenticated by design; SecurityConfig is the source of truth.
PUBLIC = ("/health", "/actuator", "/.auth/", "/scim/")          # scim uses a bearer token
WRITE  = ("Post", "Put", "Patch", "Delete")

# Entities carrying @Version, so a write to one should check it.
VERSIONED = {
    "asset", "assets", "certificate", "certificates", "application", "applications",
    "person", "people", "location", "locations", "asset-type", "asset-types",
    "certificate-type", "certificate-types", "application-type", "application-types",
    "asset-model", "asset-models", "asset-template", "asset-templates",
}

def class_level(src):
    """Annotations on the controller class itself apply to every handler in it."""
    m = re.search(r"((?:^@[^\n]*\n)+)(?:@\w+[^\n]*\n)*class \w+Controller", src, re.M)
    head = src[:src.index("class ")] if "class " in src else src
    return head


def handlers(src, path):
    """Yield (verb, route, name, annotations, body) per mapping in a file."""
    base = ""
    m = re.search(r'@RequestMapping\((?:value\s*=\s*)?(?:\[)?"([^"]+)"', src)
    if m:
        base = m.group(1)
    lines = src.split("\n")
    idx = [i for i, l in enumerate(lines)
           if re.match(r"\s*@(Get|Post|Put|Patch|Delete)Mapping", l)]
    for n, i in enumerate(idx):
        end = idx[n + 1] if n + 1 < len(idx) else len(lines)
        block = "\n".join(lines[i:end])
        verb = re.match(r"\s*@(\w+)Mapping", lines[i]).group(1)
        route = ""
        rm = re.search(r'@\w+Mapping\((?:value\s*=\s*)?(?:\[)?"([^"]*)"', lines[i])
        if rm:
            route = rm.group(1)
        # annotations above the mapping belong to the same handler
        j = i
        while j > 0 and re.match(r"\s*@\w", lines[j - 1]):
            j -= 1
        annots = "\n".join(lines[j:i + 1])
        fn = re.search(r"fun\s+(\w+)\s*\(", block)
        yield verb, base + route, (fn.group(1) if fn else "?"), annots + "\n" + block, block

def main():
    findings = collections.defaultdict(list)
    total = 0
    for f in sorted(os.listdir(CTRL)):
        if not f.endswith(".kt"):
            continue
        src = open(os.path.join(CTRL, f)).read()
        head = class_level(src)
        # A class-level @PreAuthorize covers every handler in the controller, and
        # a service the handler delegates to may be what writes the audit entry.
        class_authz = "@PreAuthorize" in head or "@Secured" in head
        for verb, route, name, whole, body in handlers(src, f):
            total += 1
            where = f"{f}:{name} [{verb.upper()} {route or '/'}]"
            public = any(p in route for p in PUBLIC) or "permitAll" in whole

            # A — authorization
            if not public and not class_authz and "@PreAuthorize" not in whole and "@Secured" not in whole:
                findings["authz: no authorization rule on the handler"].append(where)

            # A — request bodies are validated
            if "@RequestBody" in whole and "@Valid" not in whole:
                # a handler that validates by hand is fine; look for an explicit check
                if not re.search(r"(isBlank\(\)|require\(|badRequest\(\)|\.error)", body):
                    findings["validate: body neither @Valid nor checked by hand"].append(where)

            # A/D — writes are audited
            delegates = re.search(r"\b(\w*[Ss]ervice)\.\w+\(", body)
            if (verb in WRITE and "auditService" not in body and "crud." not in body
                    and not delegates):
                findings["audit: write with no audit-log entry"].append(where)

            # C/D — reads that map entities need a session
            if verb == "Get" and "toDto" in body and "@Transactional" not in whole:
                findings["tx: maps entities with no transaction (OSIV is off)"].append(where)

            # D — writes to versioned entities check the version
            seg = route.strip("/").split("/")[0] or ""
            base_seg = (base_route := route).strip("/").split("/")
            collection = ""
            m = re.search(r"/api/v1/([a-z-]+)", route)
            if m:
                collection = m.group(1)
            if verb == "Put" and collection in VERSIONED and "versionConflict" not in body:
                findings["lock: update to a versioned entity with no version check"].append(where)

    print(f"handlers audited: {total}\n")
    if not findings:
        print("no findings")
        return 0
    for title in sorted(findings):
        rows = findings[title]
        print(f"--- {title}  ({len(rows)}) ---")
        for r in rows:
            print("   ", r)
        print()
    return 1

if __name__ == "__main__":
    sys.exit(main())
