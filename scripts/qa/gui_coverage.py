#!/usr/bin/env python3
"""
GUI coverage: which controls the browser suite actually drives.

The specs assert that particular things work. This asks the opposite question —
what does the app render that no spec ever touches? Without it, "every GUI
action is tested" is a claim nobody can check.

`inventory.spec.ts` writes the inventory of every visible control per screen;
this compares it with the names the specs address.

    (cd apps/web && npx playwright test e2e/qa/inventory.spec.ts)
    python3 scripts/qa/gui_coverage.py

Reports rather than fails: an inventory entry is a *control*, and some are
genuinely display-only (a breadcrumb, a disabled cell). The list is for reading,
not gating — its job is to make an untested action visible instead of invisible.
"""
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.normpath(os.path.join(HERE, "..", "..", "apps", "web"))
INVENTORY = os.path.join(WEB, "e2e", "gui-inventory.json")

# The sidebar and header, which every screen carries and the navigation spec
# already walks.
CHROME = re.compile(
    r"^(a|button): (Dashboard|Assets|Certificates|Software|Organisation|Reports|"
    r"Notifications|Import Data|Audit Log|Settings|Asset Types|Asset Templates|"
    r"Asset Models|Certificate Types|Application Types|Locations|People|"
    r"Applications / Licences|MENU|MANAGEMENT|Collapse sidebar|Dev Admin|Admin)$"
)

# A link whose text is a record's name is data, not an action: the action is
# "open a record", which the specs do cover. Row *buttons* are kept — those are
# the row actions.
RECORD_LINK = re.compile(r"^row a: ")

# Fixture names left over from earlier runs, which are data for the same reason.
FIXTURE = re.compile(
    r"\b(Deep|QA|RBAC|Inv|Alias|Sweep|Cap|Perf|Bom|Dup|Img|SV|Reg|Arch|Toast|"
    r"D[A-Z]|F[A-Z]|S[A-Z]|U[A-Z])\w* ", re.I)


def spec_text():
    out = []
    for p in glob.glob(os.path.join(WEB, "e2e", "**", "*.ts"), recursive=True):
        if p.endswith("inventory.spec.ts"):
            continue
        out.append(open(p).read())
    return "\n".join(out)


def main():
    if not os.path.exists(INVENTORY):
        sys.exit("No inventory. Run: (cd apps/web && npx playwright test e2e/qa/inventory.spec.ts)")

    inventory = json.load(open(INVENTORY))
    specs = spec_text().lower()

    untouched, total = {}, 0
    for route, controls in sorted(inventory.items()):
        for entry in controls:
            total += 1
            if CHROME.match(entry) or RECORD_LINK.match(entry) or FIXTURE.search(entry):
                continue
            name = entry.split(": ", 1)[1] if ": " in entry else entry
            # Compare on the stable part of the name: a card reading
            # "Total Assets 187" is inventoried as "Total Assets <n>", and a
            # spec addresses it as "total assets".
            token = re.sub(r"\s*<(n|id)>", "", name).lower().strip()
            # Amounts and units belong to the value, not the control's name.
            token = re.sub(r"[£$€][\d.,<>nid\s]*[kmb]?\b", "", token).strip()
            token = re.sub(r"\s+", " ", token).strip()
            # A control counts as driven if any spec mentions its name. Loose by
            # design: the point is to surface what nothing mentions at all.
            if len(token) < 3:
                continue
            if token in specs:
                continue
            untouched.setdefault(route, []).append(entry)

    named = sum(len(v) for v in untouched.values())
    print(f"controls inventoried: {total}")
    print(f"never named by any spec: {named}\n")
    for route in sorted(untouched):
        print(f"  {route}")
        for entry in untouched[route]:
            print(f"      {entry}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
