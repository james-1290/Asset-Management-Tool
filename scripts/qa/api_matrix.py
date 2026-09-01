#!/usr/bin/env python3
"""
Exhaustive action x variation matrix.

The deep suite proves each endpoint *behaves*; this proves each **action** works
in every variation a person can put it through, and asserts the resulting state
rather than the status code. An earlier sweep counted "every endpoint reached"
as coverage — reaching `POST /assets/{id}/checkout` says nothing about what
happens when the asset is already checked out, or checked out to someone else.

Run: python3 scripts/qa/api_matrix.py [--only assets]
"""
import json, sys, urllib.request, urllib.error, uuid, datetime

BASE = "http://localhost:5115"


class Api:
    def __init__(self, identity="admin"):
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *a, **k): return None
        op = urllib.request.build_opener(NoRedirect)
        try:
            r = op.open(f"{BASE}/.auth/login/aad?identity={identity}")
        except urllib.error.HTTPError as e:
            r = e
        self.cookie = next(v.split(";")[0] for k, v in r.headers.items()
                           if k.lower() == "set-cookie" and v.startswith("AppServiceAuthSession="))

    def __call__(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(BASE + path, data=data, method=method)
        req.add_header("Cookie", self.cookie)
        req.add_header("X-Requested-With", "XMLHttpRequest")
        if data:
            req.add_header("Content-Type", "application/json")
        try:
            r = urllib.request.urlopen(req)
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw.strip().startswith(("{", "[")) else raw)
        except urllib.error.HTTPError as e:
            raw = e.read().decode()
            return e.code, (json.loads(raw) if raw.strip().startswith(("{", "[")) else raw)


class Results:
    def __init__(self):
        self.passed = self.failed = 0
        self.failures = []
        self.section = ""

    def head(self, name):
        self.section = name
        print(f"\n-- {name} " + "-" * max(0, 60 - len(name)))

    def check(self, what, ok, detail=""):
        if ok:
            self.passed += 1
            print(f"  PASS  {what}" + (f"   [{detail}]" if detail else ""))
        else:
            self.failed += 1
            self.failures.append(f"{self.section}: {what}  [{detail}]")
            print(f"  FAIL  {what}   [{detail}]")

    def report(self):
        print("\n" + "=" * 70)
        print(f"{self.passed} passed, {self.failed} failed  (of {self.passed + self.failed} variations)")
        if self.failures:
            print("\nFAILURES:")
            for f in self.failures:
                print("  -", f)
        return 1 if self.failed else 0


def today(offset=0):
    return (datetime.date.today() + datetime.timedelta(days=offset)).isoformat()


def fixtures(api, tag):
    """The supporting records every entity matrix needs."""
    f = {}
    f["assetType"] = api("POST", "/api/v1/asset-types", {"name": f"MX AType {tag}"})[1]["id"]
    f["certType"] = api("POST", "/api/v1/certificate-types", {"name": f"MX CType {tag}"})[1]["id"]
    f["appType"] = api("POST", "/api/v1/application-types", {"name": f"MX PType {tag}"})[1]["id"]
    f["locA"] = api("POST", "/api/v1/locations", {"name": f"MX Loc A {tag}"})[1]["id"]
    f["locB"] = api("POST", "/api/v1/locations", {"name": f"MX Loc B {tag}"})[1]["id"]
    f["personA"] = api("POST", "/api/v1/people",
                       {"fullName": f"MX Alice {tag}", "email": f"alice{tag}@example.com"})[1]["id"]
    f["personB"] = api("POST", "/api/v1/people",
                       {"fullName": f"MX Bob {tag}", "email": f"bob{tag}@example.com"})[1]["id"]
    f["model"] = api("POST", "/api/v1/asset-models",
                     {"name": f"MX Model {tag}", "assetTypeId": f["assetType"]})[1]["id"]
    # A type that owns models requires one to be chosen, so the "only the required
    # fields" case needs a type with no models of its own.
    f["bareType"] = api("POST", "/api/v1/asset-types", {"name": f"MX Bare {tag}"})[1]["id"]
    f["personC"] = api("POST", "/api/v1/people",
                       {"fullName": f"MX Carl {tag}", "email": f"carl{tag}@example.com"})[1]["id"]
    return f


def matrix_assets(api, r, fx, tag):
    """Every asset action, in every variation a person can reach."""
    r.head("Assets — create")

    st, minimal = api("POST", "/api/v1/assets",
                      {"name": f"MX Min {tag}", "assetTypeId": fx["bareType"], "status": "Available"})
    r.check("create with only the required fields", st in (200, 201), f"{st} {str(minimal)[:90]}")
    aid = minimal.get("id") if isinstance(minimal, dict) else None

    full_body = {
        "name": f"MX Full {tag}", "assetTypeId": fx["assetType"], "status": "Available",
        "serialNumber": f"SN-{tag}", "assetModelId": fx["model"],
        "locationId": fx["locA"], "purchaseDate": today(-400), "purchaseCost": 1234.56,
        "warrantyExpiryDate": today(200), "notes": "matrix full create",
    }
    st, full = api("POST", "/api/v1/assets", full_body)
    r.check("create with every field populated", st in (200, 201), str(st))
    fid = full.get("id") if isinstance(full, dict) else None

    if fid:
        st, back = api("GET", f"/api/v1/assets/{fid}")
        mismatches = [k for k in ("name", "serialNumber", "notes")
                      if str(back.get(k)) != str(full_body[k])]
        r.check("every field round-trips through create and read", not mismatches, f"differ: {mismatches}")
        r.check("purchase cost keeps its decimals", str(back.get("purchaseCost")).startswith("1234.5"),
                str(back.get("purchaseCost")))
        r.check("location is linked on create", back.get("locationId") == fx["locA"], str(back.get("locationId")))
        r.check("model is linked on create", back.get("assetModelId") == fx["model"], str(back.get("assetModelId")))

    st, dup = api("POST", "/api/v1/assets/check-duplicates", {"name": f"MX Full {tag}"})
    r.check("a duplicate name is reported before saving", st == 200 and bool(dup), str(st))

    r.head("Assets — edit")
    if fid:
        st, cur = api("GET", f"/api/v1/assets/{fid}")
        ver = cur.get("entityVersion")
        edit = dict(full_body); edit["name"] = f"MX Renamed {tag}"; edit["entityVersion"] = ver
        st, _ = api("PUT", f"/api/v1/assets/{fid}", edit)
        r.check("rename", st == 200, str(st))
        st, after = api("GET", f"/api/v1/assets/{fid}")
        r.check("the rename persisted", after.get("name") == f"MX Renamed {tag}", str(after.get("name")))

        move = dict(edit); move["locationId"] = fx["locB"]; move["entityVersion"] = after.get("entityVersion")
        st, _ = api("PUT", f"/api/v1/assets/{fid}", move)
        st, after2 = api("GET", f"/api/v1/assets/{fid}")
        r.check("move to a different location", after2.get("locationId") == fx["locB"], str(after2.get("locationId")))

        clear = dict(move); clear["locationId"] = None; clear["entityVersion"] = after2.get("entityVersion")
        st, _ = api("PUT", f"/api/v1/assets/{fid}", clear)
        st, after3 = api("GET", f"/api/v1/assets/{fid}")
        r.check("clear the location back to none", after3.get("locationId") in (None, ""), str(after3.get("locationId")))

        noop = dict(clear); noop["entityVersion"] = after3.get("entityVersion")
        st, _ = api("PUT", f"/api/v1/assets/{fid}", noop)
        r.check("an edit that changes nothing is accepted", st == 200, str(st))

        st, _ = api("PUT", f"/api/v1/assets/{fid}", dict(noop, entityVersion=0))
        r.check("an edit from a stale copy is refused", st == 409, str(st))

    r.head("Assets — assignment lifecycle")
    if aid:
        st, _ = api("POST", f"/api/v1/assets/{aid}/checkout", {"personId": fx["personA"]})
        r.check("check out to a person", st in (200, 204), str(st))
        st, out = api("GET", f"/api/v1/assets/{aid}")
        r.check("the assignee is recorded", out.get("assignedPersonId") == fx["personA"], str(out.get("assignedPersonId")))
        r.check("the status follows the assignment", out.get("status") in ("Assigned", "CheckedOut", "In Use"),
                str(out.get("status")))

        st, _ = api("POST", f"/api/v1/assets/{aid}/checkout", {"personId": fx["personB"]})
        r.check("checking out an asset that is already out is refused", st >= 400, str(st))

        st, _ = api("POST", f"/api/v1/assets/{aid}/checkin", {})
        r.check("check in", st in (200, 204), str(st))
        st, back_in = api("GET", f"/api/v1/assets/{aid}")
        r.check("the assignee is cleared on check-in", back_in.get("assignedPersonId") in (None, ""),
                str(back_in.get("assignedPersonId")))

        st, _ = api("POST", f"/api/v1/assets/{aid}/checkin", {})
        r.check("checking in an asset that is not out is refused", st >= 400, str(st))

        api("POST", f"/api/v1/assets/{aid}/checkout", {"personId": fx["personB"]})
        st, second = api("GET", f"/api/v1/assets/{aid}")
        r.check("reassign to a different person after check-in",
                second.get("assignedPersonId") == fx["personB"], str(second.get("assignedPersonId")))
        api("POST", f"/api/v1/assets/{aid}/checkin", {})

    r.head("Assets — end of life")
    if aid:
        st, _ = api("POST", f"/api/v1/assets/{aid}/retire", {"notes": "matrix retire"})
        r.check("retire", st in (200, 204), str(st))
        st, ret = api("GET", f"/api/v1/assets/{aid}")
        r.check("the status says retired", "retire" in str(ret.get("status")).lower(), str(ret.get("status")))

        st, _ = api("POST", f"/api/v1/assets/{aid}/sell", {"salePrice": 50, "saleDate": today()})
        r.check("a retired asset can be sold — the ordinary end of its life", st in (200, 204), str(st))
        st, retired_sold = api("GET", f"/api/v1/assets/{aid}")
        r.check("and lands in the sold state", "sold" in str(retired_sold.get("status")).lower(),
                str(retired_sold.get("status")))

        # And selling straight from an active state still works.
        st, sellable = api("POST", "/api/v1/assets",
                           {"name": f"MX Sell {tag}", "assetTypeId": fx["bareType"], "status": "Available"})
        sell_id = sellable["id"]
        st, _ = api("POST", f"/api/v1/assets/{sell_id}/sell", {"salePrice": 50, "saleDate": today()})
        r.check("sell an active asset", st in (200, 204), str(st))
        st, s2 = api("GET", f"/api/v1/assets/{sell_id}")
        r.check("the status says sold", "sold" in str(s2.get("status")).lower(), str(s2.get("status")))

    r.head("Assets — archive and restore")
    if fid:
        st, _ = api("DELETE", f"/api/v1/assets/{fid}")
        r.check("archive", st in (200, 204), str(st))
        st, listed = api("GET", f"/api/v1/assets?search=MX+Renamed+{tag}")
        ids = [i["id"] for i in listed.get("items", [])]
        r.check("an archived asset leaves the default list", fid not in ids, "still listed" if fid in ids else "")
        # Search by name rather than scanning a page: the fixture database
        # accumulates, so the row can fall past the end of any fixed page size.
        st, arch = api("GET", f"/api/v1/assets?includeArchived=true&search=MX+Renamed+{tag}")
        r.check("and appears when archived records are included",
                fid in [i["id"] for i in arch.get("items", [])],
                f"{arch.get('totalCount')} matched")
        st, _ = api("POST", f"/api/v1/assets/{fid}/restore")
        r.check("restore", st in (200, 204), str(st))
        st, back = api("GET", f"/api/v1/assets/{fid}")
        r.check("the restored asset is not archived", back.get("isArchived") is False, str(back.get("isArchived")))

    r.head("Assets — bulk operations")
    ids = []
    for i in range(3):
        st, a = api("POST", "/api/v1/assets",
                    {"name": f"MX Bulk {i} {tag}", "assetTypeId": fx["bareType"], "status": "Available"})
        if st in (200, 201): ids.append(a["id"])
    st, _ = api("POST", "/api/v1/assets/bulk-status", {"ids": ids, "status": "InMaintenance"})
    r.check("bulk status change", st in (200, 204), f"{st} {str(_)[:80]}")
    st, one = api("GET", f"/api/v1/assets/{ids[0]}") if ids else (0, {})
    r.check("the new status applied to the selection", one.get("status") == "InMaintenance", str(one.get("status")))

    st, _ = api("POST", "/api/v1/assets/bulk-edit", {"ids": ids, "locationId": fx["locB"]})
    r.check("bulk edit", st in (200, 204), str(st))
    st, one = api("GET", f"/api/v1/assets/{ids[0]}") if ids else (0, {})
    r.check("the bulk edit applied", one.get("locationId") == fx["locB"], str(one.get("locationId")))

    st, mixed = api("POST", "/api/v1/assets/bulk-archive", {"ids": ids[:1] + [str(uuid.uuid4())]})
    r.check("a bulk action with one unknown id does not fail the whole batch", st in (200, 204), str(st))
    st, empty = api("POST", "/api/v1/assets/bulk-archive", {"ids": []})
    r.check("an empty bulk selection is handled", st in (200, 204, 400), str(st))

    r.head("Assets — history and export")
    if aid:
        st, hist = api("GET", f"/api/v1/assets/{aid}/history")
        events = json.dumps(hist).lower().replace(" ", "")
        for label, needle in (("check-out", "checkedout"), ("check-in", "checkedin"),
                              ("retire", "retired"), ("creation", "created")):
            r.check(f"history records the {label}", needle in events, "")
    # The export excludes archived rows, so assert on one that is still live.
    st, live = api("POST", "/api/v1/assets",
                   {"name": f"MX Export {tag}", "assetTypeId": fx["bareType"], "status": "Available"})
    st, csv = api("GET", "/api/v1/assets/export")
    r.check("export contains a live asset", f"MX Export {tag}" in str(csv), "")
    st, csv2 = api("GET", "/api/v1/assets/export?includeArchived=true")
    r.check("export answers with the archived flag too", st == 200, str(st))


def matrix_people(api, r, fx, tag):
    """A person's whole working life: created, edited, moved, given things, offboarded."""
    r.head("People — create and edit")
    body = {"fullName": f"MX Carol {tag}", "email": f"carol{tag}@example.com",
            "jobTitle": "Engineer", "department": "IT", "locationId": fx["locA"]}
    st, p = api("POST", "/api/v1/people", body)
    r.check("create with every field", st in (200, 201), str(st))
    pid = p.get("id") if isinstance(p, dict) else None
    if not pid:
        return

    st, back = api("GET", f"/api/v1/people/{pid}")
    r.check("the details round-trip", back.get("jobTitle") == "Engineer" and back.get("department") == "IT", "")
    r.check("the location is linked", back.get("locationId") == fx["locA"], str(back.get("locationId")))

    edit = dict(body, jobTitle="Senior Engineer", entityVersion=back.get("entityVersion"))
    st, _ = api("PUT", f"/api/v1/people/{pid}", edit)
    st, after = api("GET", f"/api/v1/people/{pid}")
    r.check("edit a field", after.get("jobTitle") == "Senior Engineer", str(after.get("jobTitle")))

    move = dict(edit, locationId=fx["locB"], entityVersion=after.get("entityVersion"))
    st, _ = api("PUT", f"/api/v1/people/{pid}", move)
    st, moved = api("GET", f"/api/v1/people/{pid}")
    r.check("move to a different location", moved.get("locationId") == fx["locB"], str(moved.get("locationId")))

    st, dup = api("POST", "/api/v1/people/check-duplicates", {"email": f"carol{tag}@example.com"})
    r.check("a duplicate email is reported", st == 200, str(st))

    r.head("People — things assigned to them")
    st, a1 = api("POST", "/api/v1/assets",
                 {"name": f"MX PA1 {tag}", "assetTypeId": fx["bareType"], "status": "Available"})
    st, a2 = api("POST", "/api/v1/assets",
                 {"name": f"MX PA2 {tag}", "assetTypeId": fx["bareType"], "status": "Available"})
    a1, a2 = a1["id"], a2["id"]

    api("POST", f"/api/v1/assets/{a1}/checkout", {"personId": pid})
    st, held = api("GET", f"/api/v1/people/{pid}/assets")
    items = held.get("items", held) if isinstance(held, dict) else held
    r.check("an assigned asset shows on the person", any(i["id"] == a1 for i in items), f"{len(items)} held")

    api("POST", f"/api/v1/assets/{a2}/checkout", {"personId": pid})
    st, held2 = api("GET", f"/api/v1/people/{pid}/assets")
    items2 = held2.get("items", held2) if isinstance(held2, dict) else held2
    r.check("a second assigned asset also shows", len(items2) >= 2, f"{len(items2)} held")

    api("POST", f"/api/v1/assets/{a1}/checkin", {})
    st, held3 = api("GET", f"/api/v1/people/{pid}/assets")
    items3 = held3.get("items", held3) if isinstance(held3, dict) else held3
    r.check("returning one asset leaves the other", not any(i["id"] == a1 for i in items3) and len(items3) >= 1,
            f"{len(items3)} held")

    # move the remaining asset to somebody else
    api("POST", f"/api/v1/assets/{a2}/checkin", {})
    api("POST", f"/api/v1/assets/{a2}/checkout", {"personId": fx["personA"]})
    st, held4 = api("GET", f"/api/v1/people/{pid}/assets")
    items4 = held4.get("items", held4) if isinstance(held4, dict) else held4
    r.check("an asset reassigned to someone else leaves this person",
            not any(i["id"] == a2 for i in items4), f"{len(items4)} held")

    st, cert = api("POST", "/api/v1/certificates",
                   {"name": f"MX PCert {tag}", "certificateTypeId": fx["certType"],
                    "status": "Active", "personId": pid, "expiryDate": today(200)})
    st, pc = api("GET", f"/api/v1/people/{pid}/certificates")
    pcs = pc.get("items", pc) if isinstance(pc, dict) else pc
    r.check("a certificate assigned to the person shows on them", len(pcs) >= 1, f"{len(pcs)}")

    st, summary = api("GET", f"/api/v1/people/{pid}/summary")
    r.check("the person summary answers", st == 200, str(st))
    st, hist = api("GET", f"/api/v1/people/{pid}/history")
    r.check("the person has a history timeline", st == 200, str(st))

    r.head("People — offboarding")
    api("POST", f"/api/v1/assets/{a1}/checkout", {"personId": pid})
    st, _ = api("POST", f"/api/v1/people/{pid}/offboard",
                {"actions": [{"entityType": "Asset", "entityId": a1, "action": "free"}],
                 "deactivatePerson": False})
    r.check("offboard, freeing what they hold", st in (200, 204), str(st))
    st, freed = api("GET", f"/api/v1/assets/{a1}")
    r.check("offboarding releases the assets they held",
            freed.get("assignedPersonId") in (None, ""), str(freed.get("assignedPersonId")))

    r.head("People — archive and restore")
    st, _ = api("DELETE", f"/api/v1/people/{pid}")
    r.check("archive", st in (200, 204), str(st))
    st, listed = api("GET", "/api/v1/people?pageSize=200")
    r.check("an archived person leaves the default list",
            pid not in [i["id"] for i in listed.get("items", [])], "")
    st, _ = api("POST", f"/api/v1/people/{pid}/restore")
    r.check("restore", st in (200, 204), str(st))
    st, rp = api("GET", f"/api/v1/people/{pid}")
    r.check("the restored person is not archived", rp.get("isArchived") is False, str(rp.get("isArchived")))


def matrix_applications(api, r, fx, tag):
    """Licences: seats are the interesting part — a limit that must actually hold."""
    r.head("Applications — create, edit, renew")
    body = {"name": f"MX App {tag}", "applicationTypeId": fx["appType"], "publisher": "MX Ltd",
            "maxSeats": 2, "expiryDate": today(60), "status": "Active"}
    st, app = api("POST", "/api/v1/applications", body)
    r.check("create with seats and an expiry", st in (200, 201), str(app)[:80])
    if st not in (200, 201):
        return
    aid = app["id"]

    st, back = api("GET", f"/api/v1/applications/{aid}")
    r.check("the seat limit round-trips", back.get("maxSeats") == 2, str(back.get("maxSeats")))

    edit = dict(body, publisher="MX Renamed Ltd", entityVersion=back.get("entityVersion"))
    st, _ = api("PUT", f"/api/v1/applications/{aid}", edit)
    st, after = api("GET", f"/api/v1/applications/{aid}")
    r.check("edit a field", after.get("publisher") == "MX Renamed Ltd", str(after.get("publisher")))

    st, _ = api("POST", f"/api/v1/applications/{aid}/renew", {"newExpiryDate": today(400)})
    st, renewed = api("GET", f"/api/v1/applications/{aid}")
    r.check("renew moves the expiry date", str(renewed.get("expiryDate")) == today(400), str(renewed.get("expiryDate")))

    r.head("Applications — seats")
    st, _ = api("POST", f"/api/v1/applications/{aid}/seats", {"personId": fx["personA"]})
    r.check("assign a seat", st in (200, 201, 204), str(st))
    st, _ = api("POST", f"/api/v1/applications/{aid}/seats", {"personId": fx["personB"]})
    r.check("assign the second seat", st in (200, 201, 204), str(st))
    st, seats = api("GET", f"/api/v1/applications/{aid}/seats")
    items = seats.get("items", seats) if isinstance(seats, dict) else seats
    r.check("both seats are listed", len(items) == 2, f"{len(items)}")

    st, dupe = api("POST", f"/api/v1/applications/{aid}/seats", {"personId": fx["personA"]})
    r.check("giving the same person a second seat is refused", st >= 400, str(dupe)[:60])
    # A *third* person: this is the seat limit itself, not a duplicate.
    st, over = api("POST", f"/api/v1/applications/{aid}/seats", {"personId": fx["personC"]})
    r.check("a third person cannot take a seat on a two-seat licence", st >= 400, str(over)[:80])
    st, counted = api("GET", f"/api/v1/applications/{aid}")
    r.check("used seats never exceeds the limit",
            (counted.get("usedSeats") or 0) <= (counted.get("maxSeats") or 0),
            f"{counted.get('usedSeats')}/{counted.get('maxSeats')}")

    st, _ = api("DELETE", f"/api/v1/applications/{aid}/seats/{fx['personA']}")
    r.check("release a seat", st in (200, 204), str(st))
    st, seats2 = api("GET", f"/api/v1/applications/{aid}/seats")
    items2 = seats2.get("items", seats2) if isinstance(seats2, dict) else seats2
    r.check("the released seat is gone", len(items2) == 1, f"{len(items2)}")

    st, again = api("POST", f"/api/v1/applications/{aid}/seats", {"personId": fx["personA"]})
    r.check("the freed seat can be given to someone again", st in (200, 201, 204), str(st))

    r.head("Applications — state and lifecycle")
    st, _ = api("POST", f"/api/v1/applications/{aid}/deactivate", {})
    st, deact = api("GET", f"/api/v1/applications/{aid}")
    r.check("deactivate", "inactive" in str(deact.get("status")).lower() or deact.get("status") != "Active",
            str(deact.get("status")))
    st, _ = api("POST", f"/api/v1/applications/{aid}/reactivate", {})
    st, react = api("GET", f"/api/v1/applications/{aid}")
    r.check("reactivate", str(react.get("status")) == "Active", str(react.get("status")))

    st, hist = api("GET", f"/api/v1/applications/{aid}/history")
    ev = json.dumps(hist).lower().replace(" ", "")
    r.check("history records the renewal", "renew" in ev, "")

    st, held = api("DELETE", f"/api/v1/applications/{aid}")
    r.check("archiving a licence whose seats are in use is refused", st >= 400, str(held)[:70])
    for pid in (fx["personA"], fx["personB"]):
        api("DELETE", f"/api/v1/applications/{aid}/seats/{pid}")
    st, _ = api("DELETE", f"/api/v1/applications/{aid}")
    r.check("archiving once the seats are released", st in (200, 204), str(st))
    st, listed = api("GET", f"/api/v1/applications?search=MX+App+{tag}")
    r.check("an archived licence leaves the list",
            aid not in [i["id"] for i in listed.get("items", [])], "")
    st, arch = api("GET", f"/api/v1/applications?includeArchived=true&search=MX+App+{tag}")
    r.check("and is visible when archived rows are asked for",
            aid in [i["id"] for i in arch.get("items", [])], f"{arch.get('totalCount')} matched")
    api("POST", f"/api/v1/applications/{aid}/restore")


def matrix_certificates(api, r, fx, tag):
    """Certificates: the status people see is derived from the date, not stored."""
    r.head("Certificates — create, renew, expiry")
    body = {"name": f"MX Cert {tag}", "certificateTypeId": fx["certType"], "status": "Active",
            "issuedDate": today(-30), "expiryDate": today(45), "issuer": "MX CA",
            "personId": fx["personA"], "locationId": fx["locA"]}
    st, c = api("POST", "/api/v1/certificates", body)
    r.check("create with dates, issuer, owner and location", st in (200, 201), str(c)[:80])
    if st not in (200, 201):
        return
    cid = c["id"]

    st, back = api("GET", f"/api/v1/certificates/{cid}")
    r.check("the owner is linked", back.get("personId") == fx["personA"], str(back.get("personId")))
    r.check("the location is linked", back.get("locationId") == fx["locA"], str(back.get("locationId")))

    # An expiry in the past must read as expired even though the stored status says Active.
    expired = dict(body, name=f"MX Expired {tag}", expiryDate=today(-1))
    st, e = api("POST", "/api/v1/certificates", expired)
    st, eback = api("GET", f"/api/v1/certificates/{e['id']}")
    r.check("a past expiry date reads as expired, whatever is stored",
            "expir" in str(eback.get("status")).lower(), str(eback.get("status")))

    st, _ = api("POST", f"/api/v1/certificates/{cid}/renew", {"newExpiryDate": today(500)})
    st, renewed = api("GET", f"/api/v1/certificates/{cid}")
    r.check("renew moves the expiry", str(renewed.get("expiryDate")) == today(500), str(renewed.get("expiryDate")))
    r.check("renewing brings it back to active", "active" in str(renewed.get("status")).lower(),
            str(renewed.get("status")))

    st, _ = api("POST", f"/api/v1/certificates/{e['id']}/renew", {"newExpiryDate": today(-5)})
    r.check("renewing to a date in the past is refused", st >= 400, str(st))

    r.head("Certificates — bulk and lifecycle")
    st, _ = api("POST", "/api/v1/certificates/bulk-status", {"ids": [cid], "status": "Revoked"})
    st, rev = api("GET", f"/api/v1/certificates/{cid}")
    r.check("bulk status change applies", str(rev.get("status")) == "Revoked", str(rev.get("status")))

    st, _ = api("DELETE", f"/api/v1/certificates/{cid}")
    st, arch = api("GET", f"/api/v1/certificates?includeArchived=true&search=MX+Cert+{tag}")
    r.check("an archived certificate is visible when asked for",
            cid in [i["id"] for i in arch.get("items", [])], f"{arch.get('totalCount')} matched")
    st, _ = api("POST", f"/api/v1/certificates/{cid}/restore")
    r.check("restore", st in (200, 204), str(st))


def matrix_locations(api, r, fx, tag):
    """A location holds things; archiving one has to deal with its contents."""
    r.head("Locations — contents")
    st, loc = api("POST", "/api/v1/locations", {"name": f"MX LocC {tag}", "city": "Leeds", "country": "UK"})
    lid = loc["id"]
    st, back = api("GET", f"/api/v1/locations/{lid}")
    r.check("create with address fields", back.get("city") == "Leeds", str(back.get("city")))

    st, a = api("POST", "/api/v1/assets",
                {"name": f"MX LocAsset {tag}", "assetTypeId": fx["bareType"], "status": "Available",
                 "locationId": lid})
    st, contents = api("GET", f"/api/v1/locations/{lid}/assets")
    items = contents.get("items", contents) if isinstance(contents, dict) else contents
    r.check("an asset placed there shows in the location's assets", len(items) >= 1, f"{len(items)}")

    for sub in ("people", "certificates", "applications"):
        st, _ = api("GET", f"/api/v1/locations/{lid}/{sub}")
        r.check(f"the location's {sub} list answers", st == 200, str(st))

    r.head("Locations — archive with contents")
    st, refused = api("DELETE", f"/api/v1/locations/{lid}")
    r.check("archiving a location that still holds things is refused", st >= 400, str(refused)[:70])

    st, _ = api("POST", f"/api/v1/locations/{lid}/reassign-and-archive", {"targetLocationId": fx["locB"]})
    r.check("reassign the contents and archive", st in (200, 204), str(st))
    st, moved = api("GET", f"/api/v1/assets/{a['id']}")
    r.check("the asset moved to the target location", moved.get("locationId") == fx["locB"],
            str(moved.get("locationId")))
    st, gone = api("GET", f"/api/v1/locations/{lid}")
    r.check("the emptied location is archived", gone.get("isArchived") is True, str(gone.get("isArchived")))


def matrix_types_and_catalogue(api, r, fx, tag):
    """Types, models and templates — including custom fields of all seven kinds."""
    r.head("Types — custom fields of every kind")
    fields = [
        {"name": "Text F", "fieldType": "Text", "isRequired": False, "sortOrder": 1},
        {"name": "Num F", "fieldType": "Number", "isRequired": False, "sortOrder": 2},
        {"name": "Date F", "fieldType": "Date", "isRequired": False, "sortOrder": 3},
        {"name": "Bool F", "fieldType": "Boolean", "isRequired": False, "sortOrder": 4},
        {"name": "One F", "fieldType": "SingleSelect", "options": "a,b,c", "isRequired": False, "sortOrder": 5},
        {"name": "Many F", "fieldType": "MultiSelect", "options": "x,y,z", "isRequired": False, "sortOrder": 6},
        {"name": "Url F", "fieldType": "Url", "isRequired": False, "sortOrder": 7},
    ]
    st, t = api("POST", "/api/v1/asset-types", {"name": f"MX CF Type {tag}", "customFields": fields})
    r.check("create a type carrying all seven field kinds", st in (200, 201), str(t)[:70])
    tid = t["id"]
    st, defs = api("GET", f"/api/v1/asset-types/{tid}/customfields")
    got = {d["fieldType"] for d in (defs if isinstance(defs, list) else defs.get("items", []))}
    r.check("all seven kinds are stored", len(got) == 7, f"{sorted(got)}")

    values = [{"fieldDefinitionId": d["id"], "value": "1" if d["fieldType"] in ("Number",) else
               ("true" if d["fieldType"] == "Boolean" else
                ("2026-01-01" if d["fieldType"] == "Date" else
                 ("a" if d["fieldType"] == "SingleSelect" else
                  ("x,y" if d["fieldType"] == "MultiSelect" else
                   ("https://example.com" if d["fieldType"] == "Url" else "text")))))}
              for d in (defs if isinstance(defs, list) else defs.get("items", []))]
    st, a = api("POST", "/api/v1/assets", {"name": f"MX CF Asset {tag}", "assetTypeId": tid,
                                            "status": "Available", "customFieldValues": values})
    r.check("create an asset with a value for every field", st in (200, 201), str(a)[:70])
    if st in (200, 201):
        st, back = api("GET", f"/api/v1/assets/{a['id']}")
        vals = back.get("customFieldValues", [])
        r.check("every custom value round-trips", len(vals) == 7, f"{len(vals)} of 7")

    r.head("Types — edit, in-use protection, archive")
    st, cur = api("GET", f"/api/v1/asset-types/{tid}")
    st, _ = api("PUT", f"/api/v1/asset-types/{tid}",
                {"name": f"MX CF Renamed {tag}", "entityVersion": cur.get("entityVersion")})
    st, after = api("GET", f"/api/v1/asset-types/{tid}")
    r.check("rename a type", after.get("name") == f"MX CF Renamed {tag}", str(after.get("name")))
    st, refused = api("DELETE", f"/api/v1/asset-types/{tid}")
    r.check("archiving a type still in use is refused", st >= 400, str(refused)[:70])

    st, spare = api("POST", "/api/v1/asset-types", {"name": f"MX Spare {tag}"})
    st, _ = api("DELETE", f"/api/v1/asset-types/{spare['id']}")
    r.check("archiving an unused type is allowed", st in (200, 204), str(st))
    st, _ = api("POST", f"/api/v1/asset-types/{spare['id']}/restore")
    r.check("restore a type", st in (200, 204), str(st))

    r.head("Asset models — image lifecycle")
    st, m = api("POST", "/api/v1/asset-models", {"name": f"MX IMod {tag}", "assetTypeId": fx["bareType"],
                                                  "manufacturer": "MX Corp"})
    r.check("create a model", st in (200, 201), str(st))
    mid = m["id"]
    st, mb = api("GET", f"/api/v1/asset-models/{mid}")
    r.check("the manufacturer round-trips", mb.get("manufacturer") == "MX Corp", str(mb.get("manufacturer")))
    st, cur = api("GET", f"/api/v1/asset-models/{mid}")
    st, _ = api("PUT", f"/api/v1/asset-models/{mid}",
                {"name": f"MX IMod2 {tag}", "manufacturer": "MX Corp2",
                 "entityVersion": cur.get("entityVersion")})
    r.check("edit a model", st == 200, str(st))
    st, _ = api("GET", f"/api/v1/asset-models/{mid}/image")
    r.check("asking for an absent image is a clean answer, not an error", st in (200, 204, 404), str(st))
    st, _ = api("DELETE", f"/api/v1/asset-models/{mid}")
    r.check("archive a model", st in (200, 204), str(st))
    st, _ = api("POST", f"/api/v1/asset-models/{mid}/restore")
    r.check("restore a model", st in (200, 204), str(st))

    r.head("Asset templates")
    st, tpl = api("POST", "/api/v1/asset-templates",
                  {"name": f"MX Tpl {tag}", "assetTypeId": fx["bareType"],
                   "purchaseCost": 99.99, "depreciationMonths": 24, "locationId": fx["locA"],
                   "notes": "template notes"})
    r.check("create a template with defaults", st in (200, 201), str(tpl)[:70])
    if st in (200, 201):
        st, tb = api("GET", f"/api/v1/asset-templates/{tpl['id']}")
        r.check("the template's defaults round-trip",
                str(tb.get("purchaseCost")).startswith("99.9") and tb.get("depreciationMonths") == 24, "")
        st, _ = api("DELETE", f"/api/v1/asset-templates/{tpl['id']}")
        st, _ = api("POST", f"/api/v1/asset-templates/{tpl['id']}/restore")
        r.check("template archive and restore", st in (200, 204), str(st))


def matrix_cross_cutting(api, r, fx, tag):
    """The features that sit across entities: views, rules, reports, search, settings."""
    r.head("Saved views")
    st, v = api("POST", "/api/v1/saved-views",
                {"entityType": "assets", "name": f"MX View {tag}", "configuration": '{"sortBy":"name"}'})
    r.check("create a view", st in (200, 201), str(v)[:70])
    vid = v["id"]
    st, _ = api("PUT", f"/api/v1/saved-views/{vid}", {"name": f"MX View2 {tag}", "configuration": '{"sortBy":"status"}'})
    r.check("rename a view", st == 200, str(st))
    st, _ = api("PUT", f"/api/v1/saved-views/{vid}/default", {})
    r.check("set it as the default", st in (200, 204), str(st))
    st, listed = api("GET", "/api/v1/saved-views?entityType=assets")
    items = listed if isinstance(listed, list) else listed.get("items", [])
    r.check("the default flag is visible on the list",
            any(i["id"] == vid and i.get("isDefault") for i in items), "")
    st, _ = api("DELETE", f"/api/v1/saved-views/{vid}")
    r.check("delete a view", st in (200, 204), str(st))

    r.head("Alert rules")
    st, rule = api("POST", "/api/v1/alert-rules",
                   {"name": f"MX Rule {tag}", "entityTypes": "asset", "thresholds": "30", "notifyEmail": True})
    r.check("create a rule", st in (200, 201), str(rule)[:70])
    rid = rule["id"]
    st, _ = api("PUT", f"/api/v1/alert-rules/{rid}",
                {"name": f"MX Rule2 {tag}", "entityTypes": "asset,certificate", "thresholds": "7,30",
                 "notifyEmail": False, "isActive": False})
    r.check("edit a rule, including turning it off", st == 200, str(st))
    st, _ = api("DELETE", f"/api/v1/alert-rules/{rid}")
    r.check("delete a rule", st in (200, 204), str(st))

    r.head("Reports and dashboard")
    for report in ("expiries", "asset-summary", "depreciation", "assignments", "licence-summary", "asset-lifecycle"):
        st, _ = api("GET", f"/api/v1/reports/{report}")
        r.check(f"the {report} report answers", st == 200, str(st))
    for widget in ("summary", "asset-expiries", "certificate-expiries", "assets-by-type",
                   "assets-by-location", "assets-by-age", "application-summary"):
        st, _ = api("GET", f"/api/v1/dashboard/{widget}")
        r.check(f"dashboard widget '{widget}' answers", st in (200, 404), str(st))

    r.head("Search and settings")
    st, hits = api("GET", f"/api/v1/search?q=MX")
    r.check("search across entities answers", st == 200, str(st))
    st, sys_settings = api("GET", "/api/v1/settings/system")
    r.check("system settings read", st == 200, str(st))
    if st == 200:
        st, _ = api("PUT", "/api/v1/settings/system", dict(sys_settings, organizationName="MX Org"))
        r.check("system settings write", st in (200, 204), str(st))
    st, users = api("GET", "/api/v1/users")
    r.check("users list", st == 200, str(st))
    st, roles = api("GET", "/api/v1/roles")
    r.check("roles list", st == 200, str(st))

    r.head("Import")
    for entity in ("assets", "people", "certificates"):
        st, _ = api("GET", f"/api/v1/import/{entity}/template")
        r.check(f"an import template exists for {entity}", st == 200, str(st))


def main():
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1]
    api = Api()
    r = Results()
    tag = uuid.uuid4().hex[:8]
    fx = fixtures(api, tag)
    print(f"action x variation matrix   (fixtures tagged {tag})")
    for name, fn in (("assets", matrix_assets), ("people", matrix_people),
                     ("applications", matrix_applications),
                     ("certificates", matrix_certificates),
                     ("locations", matrix_locations),
                     ("catalogue", matrix_types_and_catalogue),
                     ("cross-cutting", matrix_cross_cutting)):
        if only and only != name:
            continue
        fn(api, r, fx, tag)
    return r.report()


if __name__ == "__main__":
    sys.exit(main())
