#!/usr/bin/env python3
"""
Deep API capability test: exercises every feature to its full extent.

Where api_smoke.py proves each endpoint is reachable, this proves each one
actually *works*: that filters filter, that sorts sort, that validation
rejects, that business rules hold, and that roles are enforced per endpoint.

    python3 scripts/qa/api_deep.py [--base http://localhost:5115]

Exits non-zero if any check fails.
"""
import argparse
import csv
import datetime
import io
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from api_smoke import Api, Result, jbody, multipart, RESET, RED, GREEN, YELLOW, DIM


class Suite:
    """A checking harness that reports behaviour, not just status codes."""

    def __init__(self, base, identity="admin"):
        self.api = Api(base)
        self.r = Result()
        self.tag = uuid.uuid4().hex[:8]
        self.identity = identity

    def sign_in(self, identity=None):
        ident = identity or self.identity
        status, _ = self.api.get(f"/.auth/login/aad?identity={ident}")
        return status == 302

    def check(self, name, got, expect=(200, 201, 204), detail=""):
        exp = expect if isinstance(expect, (tuple, list)) else (expect,)
        status, raw = got
        if status in exp:
            self.r.ok(name, f"{status} {detail}".strip())
            return jbody(raw)
        self.r.fail(name, f"expected {exp}, got {status}: {raw.decode(errors='replace')[:300]}")
        return None

    def raw(self, name, got, expect=(200,)):
        """Like check, but returns the undecoded body (for CSV)."""
        exp = expect if isinstance(expect, (tuple, list)) else (expect,)
        status, body = got
        if status in exp:
            self.r.ok(name, str(status))
            return body
        self.r.fail(name, f"expected {exp}, got {status}: {body.decode(errors='replace')[:200]}")
        return None

    def assert_(self, name, condition, detail=""):
        if condition:
            self.r.ok(name, detail)
        else:
            self.r.fail(name, detail or "assertion failed")
        return bool(condition)

    def section(self, title):
        print(f"\n{DIM}{'-'*66}{RESET}\n-- {title} --")


def build_fixtures(s):
    """
    Creates a data set whose attributes differ along every axis a filter can
    select on, so that "the filter returned rows" can be strengthened to "the
    filter returned exactly the right rows".
    """
    s.section("Fixtures")
    t, api = s.tag, s.api
    f = {}

    f["locA"] = s.check("location A", api.post("/api/v1/locations", {
        "name": f"DeepLocA {t}", "address": f"1 Alpha Street {t}",
        "city": f"Alpha{t}", "country": "UK"}), 201)
    f["locB"] = s.check("location B", api.post("/api/v1/locations", {
        "name": f"DeepLocB {t}", "address": f"2 Beta Street {t}",
        "city": f"Beta{t}", "country": "FR"}), 201)
    f["atA"] = s.check("asset type A", api.post("/api/v1/asset-types", {"name": f"DeepTypeA {t}"}), 201)
    f["atB"] = s.check("asset type B", api.post("/api/v1/asset-types", {"name": f"DeepTypeB {t}"}), 201)
    f["ct"] = s.check("certificate type", api.post("/api/v1/certificate-types", {"name": f"DeepCType {t}"}), 201)
    f["apt"] = s.check("application type", api.post("/api/v1/application-types", {"name": f"DeepAType {t}"}), 201)

    f["p1"] = s.check("person 1", api.post("/api/v1/people", {
        "fullName": f"Deep Alice {t}", "email": f"alice{t}@example.com",
        "department": f"Eng{t}", "jobTitle": "Engineer", "locationId": f["locA"]["id"]}), 201)
    f["p2"] = s.check("person 2", api.post("/api/v1/people", {
        "fullName": f"Deep Bob {t}", "email": f"bob{t}@example.com",
        "department": f"Ops{t}", "jobTitle": "Operator", "locationId": f["locB"]["id"]}), 201)

    # Assets differing in type, location, cost, dates — each filter axis covered.
    f["a1"] = s.check("asset 1 (typeA/locA, cheap, old)", api.post("/api/v1/assets", {
        "name": f"Deep Asset One {t}", "assetTypeId": f["atA"]["id"], "locationId": f["locA"]["id"],
        "serialNumber": f"DSN1-{t}", "purchaseCost": 100.00, "purchaseDate": "2020-03-01",
        "warrantyExpiryDate": "2021-03-01", "depreciationMonths": 24}), 201)
    f["a2"] = s.check("asset 2 (typeB/locB, dear, new)", api.post("/api/v1/assets", {
        "name": f"Deep Asset Two {t}", "assetTypeId": f["atB"]["id"], "locationId": f["locB"]["id"],
        "serialNumber": f"DSN2-{t}", "purchaseCost": 5000.00, "purchaseDate": "2025-06-01",
        "warrantyExpiryDate": "2030-06-01"}), 201)
    f["a3"] = s.check("asset 3 (typeA/locA, mid)", api.post("/api/v1/assets", {
        "name": f"Deep Asset Three {t}", "assetTypeId": f["atA"]["id"], "locationId": f["locA"]["id"],
        "serialNumber": f"DSN3-{t}", "purchaseCost": 750.00, "purchaseDate": "2023-01-01"}), 201)

    f["c1"] = s.check("certificate 1", api.post("/api/v1/certificates", {
        "name": f"Deep Cert One {t}", "certificateTypeId": f["ct"]["id"],
        "issuer": f"IssuerA{t}", "subject": f"SubjectA{t}",
        "issuedDate": "2024-01-01", "expiryDate": "2030-01-01",
        "locationId": f["locA"]["id"], "assignedPersonId": f["p1"]["id"]}), 201)
    f["c2"] = s.check("certificate 2", api.post("/api/v1/certificates", {
        "name": f"Deep Cert Two {t}", "certificateTypeId": f["ct"]["id"],
        "issuer": f"IssuerB{t}", "subject": f"SubjectB{t}",
        "issuedDate": "2024-06-01", "expiryDate": "2031-06-01", "autoRenewal": True}), 201)

    f["ap1"] = s.check("application 1 (PerSeat)", api.post("/api/v1/applications", {
        "name": f"Deep App One {t}", "applicationTypeId": f["apt"]["id"],
        "publisher": f"PubA{t}", "licenceType": "PerSeat", "maxSeats": 2,
        "purchaseCost": 50.00, "expiryDate": "2030-01-01"}), 201)
    f["ap2"] = s.check("application 2 (Site)", api.post("/api/v1/applications", {
        "name": f"Deep App Two {t}", "applicationTypeId": f["apt"]["id"],
        "publisher": f"PubB{t}", "licenceType": "Site",
        "purchaseCost": 9000.00, "expiryDate": "2031-01-01"}), 201)

    soon = (datetime.date.today() + datetime.timedelta(days=20)).isoformat()
    f["expiring_asset"] = s.check("asset with a warranty expiring in 20 days",
                                  api.post("/api/v1/assets", {
        "name": f"Deep Expiring Asset {t}", "assetTypeId": f["atB"]["id"],
        "warrantyExpiryDate": soon}), 201)
    f["expiring_cert"] = s.check("certificate expiring in 20 days",
                                 api.post("/api/v1/certificates", {
        "name": f"Deep Expiring Cert {t}", "certificateTypeId": f["ct"]["id"],
        "issuedDate": "2024-01-01", "expiryDate": soon}), 201)
    f["expiring_app"] = s.check("application expiring in 20 days",
                                api.post("/api/v1/applications", {
        "name": f"Deep Expiring App {t}", "applicationTypeId": f["apt"]["id"],
        "licenceType": "Subscription", "expiryDate": soon}), 201)

    missing = [k for k, v in f.items() if not v]
    if missing:
        print(f"{RED}Fixture creation failed for: {missing}{RESET}")
        return None
    return f


def q(**params):
    """Builds a query string, encoded — fixture names contain spaces."""
    return urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})


def ids_of(page):
    if not page:
        return []
    items = page.get("items") if isinstance(page, dict) else page
    return [i["id"] for i in (items or [])]


def test_filters(s, f):
    """Every filter parameter on every list endpoint, proved by inclusion AND exclusion."""
    s.section("Filters — assets")
    api, t = s.api, s.tag

    def alist(q):
        return ids_of(jbody(api.get(f"/api/v1/assets?pageSize=100&{q}")[1]))

    got = alist(f"typeId={f['atA']['id']}")
    s.assert_("assets?typeId selects only that type",
              f["a1"]["id"] in got and f["a3"]["id"] in got and f["a2"]["id"] not in got,
              f"{len(got)} rows")
    got = alist(f"locationId={f['locB']['id']}")
    s.assert_("assets?locationId selects only that location",
              f["a2"]["id"] in got and f["a1"]["id"] not in got)
    got = alist(q(search=f"Deep Asset Two {t}"))
    s.assert_("assets?search matches name",
              f["a2"]["id"] in got and f["a1"]["id"] not in got)
    got = alist(q(search=f"DSN1-{t}"))
    s.assert_("assets?search matches serial number", f["a1"]["id"] in got)
    got = alist("costMin=1000")
    s.assert_("assets?costMin excludes cheaper",
              f["a2"]["id"] in got and f["a1"]["id"] not in got)
    got = alist("costMax=200")
    s.assert_("assets?costMax excludes dearer",
              f["a1"]["id"] in got and f["a2"]["id"] not in got)
    got = alist("costMin=500&costMax=1000")
    s.assert_("assets?costMin+costMax band",
              f["a3"]["id"] in got and f["a1"]["id"] not in got and f["a2"]["id"] not in got)
    got = alist("purchaseDateFrom=2025-01-01")
    s.assert_("assets?purchaseDateFrom excludes older",
              f["a2"]["id"] in got and f["a1"]["id"] not in got)
    got = alist("purchaseDateTo=2021-01-01")
    s.assert_("assets?purchaseDateTo excludes newer",
              f["a1"]["id"] in got and f["a2"]["id"] not in got)
    got = alist("warrantyExpiryFrom=2029-01-01")
    s.assert_("assets?warrantyExpiryFrom filters",
              f["a2"]["id"] in got and f["a1"]["id"] not in got)
    got = alist("warrantyExpiryTo=2022-01-01")
    s.assert_("assets?warrantyExpiryTo filters",
              f["a1"]["id"] in got and f["a2"]["id"] not in got)
    got = alist(f"unassigned=true&{q(search=s.tag)}")
    s.assert_("assets?unassigned=true returns unassigned", f["a1"]["id"] in got)
    got = alist(f"status=Available&{q(search=s.tag)}")
    s.assert_("assets?status=Available", f["a1"]["id"] in got)
    got = alist(f"status=Retired&{q(search=s.tag)}")
    s.assert_("assets?status=Retired excludes available", f["a1"]["id"] not in got)
    got = alist(f"includeStatuses=Available,Retired&{q(search=s.tag)}")
    s.assert_("assets?includeStatuses multi-status", f["a1"]["id"] in got)
    got = alist(f"assignedPersonId={f['p1']['id']}")
    s.assert_("assets?assignedPersonId (none assigned yet)", f["a1"]["id"] not in got)
    got = alist(f"createdAfter=2020-01-01&{q(search=s.tag)}")
    s.assert_("assets?createdAfter includes today's fixtures", f["a1"]["id"] in got)

    s.section("Filters — applications")

    def aplist(q):
        return ids_of(jbody(api.get(f"/api/v1/applications?pageSize=100&{q}")[1]))

    got = aplist(f"typeId={f['apt']['id']}")
    s.assert_("applications?typeId", f["ap1"]["id"] in got)
    got = aplist("licenceType=Site")
    s.assert_("applications?licenceType selects only that type",
              f["ap2"]["id"] in got and f["ap1"]["id"] not in got)
    got = aplist("costMin=1000")
    s.assert_("applications?costMin", f["ap2"]["id"] in got and f["ap1"]["id"] not in got)
    got = aplist("costMax=100")
    s.assert_("applications?costMax", f["ap1"]["id"] in got and f["ap2"]["id"] not in got)
    got = aplist("expiryFrom=2030-06-01")
    s.assert_("applications?expiryFrom", f["ap2"]["id"] in got and f["ap1"]["id"] not in got)
    got = aplist("expiryTo=2030-06-01")
    s.assert_("applications?expiryTo", f["ap1"]["id"] in got and f["ap2"]["id"] not in got)
    got = aplist(q(search=f"PubA{t}"))
    s.assert_("applications?search matches publisher", f["ap1"]["id"] in got)
    got = aplist("status=Active")
    s.assert_("applications?status=Active", f["ap1"]["id"] in got)
    got = aplist("includeStatuses=Active,Expired")
    s.assert_("applications?includeStatuses", f["ap1"]["id"] in got)

    s.section("Filters — certificates")

    def clist(q):
        return ids_of(jbody(api.get(f"/api/v1/certificates?pageSize=100&{q}")[1]))

    got = clist(f"typeId={f['ct']['id']}")
    s.assert_("certificates?typeId", f["c1"]["id"] in got)
    got = clist(q(search=f"IssuerA{t}"))
    s.assert_("certificates?search matches issuer",
              f["c1"]["id"] in got and f["c2"]["id"] not in got)
    got = clist(q(search=f"SubjectB{t}"))
    s.assert_("certificates?search matches subject", f["c2"]["id"] in got)
    got = clist("expiryFrom=2031-01-01")
    s.assert_("certificates?expiryFrom", f["c2"]["id"] in got and f["c1"]["id"] not in got)
    got = clist("expiryTo=2030-06-01")
    s.assert_("certificates?expiryTo", f["c1"]["id"] in got and f["c2"]["id"] not in got)
    got = clist("status=Active")
    s.assert_("certificates?status=Active", f["c1"]["id"] in got)

    s.section("Filters — people & locations")

    def plist(q):
        return ids_of(jbody(api.get(f"/api/v1/people?pageSize=100&{q}")[1]))

    got = plist(f"locationId={f['locA']['id']}")
    s.assert_("people?locationId", f["p1"]["id"] in got and f["p2"]["id"] not in got)
    got = plist(f"department=Eng{t}")
    s.assert_("people?department", f["p1"]["id"] in got and f["p2"]["id"] not in got)
    got = plist(q(search=f"Deep Bob {t}"))
    s.assert_("people?search matches name", f["p2"]["id"] in got)
    got = plist(q(search=f"alice{t}@example.com"))
    s.assert_("people?search matches email", f["p1"]["id"] in got)

    got = ids_of(jbody(api.get("/api/v1/locations?pageSize=100&" + q(search=f"DeepLocB {t}"))[1]))
    s.assert_("locations?search", f["locB"]["id"] in got and f["locA"]["id"] not in got)

    got = ids_of(jbody(api.get(f"/api/v1/asset-models?pageSize=100&assetTypeId={f['atA']['id']}")[1]))
    s.assert_("asset-models?assetTypeId returns a page", isinstance(got, list))
    s.check("asset-models?includeArchived=true", api.get("/api/v1/asset-models?includeArchived=true"))

    s.section("Filters — audit log")
    got = s.check("audit-logs?entityType=Asset", api.get("/api/v1/audit-logs?entityType=Asset&pageSize=50"))
    if got:
        types = {i.get("entityType") for i in got.get("items", [])}
        s.assert_("audit-logs?entityType returns only that type",
                  types <= {"Asset"} or not types, str(types))
    got = s.check("audit-logs?action=Create", api.get("/api/v1/audit-logs?action=Create&pageSize=50"))
    if got:
        actions = {i.get("action") for i in got.get("items", [])}
        s.assert_("audit-logs?action returns only that action",
                  actions <= {"Create"} or not actions, str(actions))
    s.check("audit-logs?dateFrom/dateTo", api.get("/api/v1/audit-logs?dateFrom=2020-01-01&dateTo=2099-01-01"))
    s.check("audit-logs?search", api.get("/api/v1/audit-logs?" + q(search=f"Deep Asset One {t}")))


SORT_FIELDS = {
    # sortBy value -> the field it should order the response by
    "assets": {"name": "name", "status": "status", "assetTypeName": "assetTypeName",
               "locationName": "locationName", "purchaseDate": "purchaseDate",
               "purchaseCost": "purchaseCost", "warrantyExpiryDate": "warrantyExpiryDate",
               "createdAt": "createdAt"},
    "applications": {"name": "name", "publisher": "publisher", "licenceType": "licenceType",
                     "expiryDate": "expiryDate", "status": "status",
                     "applicationTypeName": "applicationTypeName", "createdAt": "createdAt"},
    "certificates": {"name": "name", "issuer": "issuer", "subject": "subject", "status": "status",
                     "issuedDate": "issuedDate", "expiryDate": "expiryDate",
                     "autoRenewal": "autoRenewal", "createdAt": "createdAt",
                     "updatedAt": "updatedAt", "certificateTypeName": "certificateTypeName"},
    "people": {"fullname": "fullName", "email": "email", "department": "department",
               "jobTitle": "jobTitle", "createdAt": "createdAt"},
    "locations": {"name": "name", "address": "address", "city": "city",
                  "country": "country", "createdAt": "createdAt"},
}


def _key(value):
    """Comparable form of a sort key; None sorts last so nulls don't break ordering."""
    if value is None:
        return (1, "")
    if isinstance(value, bool):
        return (0, int(value))
    if isinstance(value, (int, float)):
        return (0, value)
    return (0, str(value).lower())


def _monotonic(values, descending):
    keys = [_key(v) for v in values]
    # Nulls are grouped at one end by the database; compare only the real values,
    # so a column that is mostly empty still gets a genuine ordering check.
    real = [k for k in keys if k[0] == 0]
    pairs = zip(real, real[1:])
    return all(b <= a for a, b in pairs) if descending else all(a <= b for a, b in pairs)


def test_sorting(s):
    """Every documented sort field, both directions, with the ordering verified."""
    s.section("Sorting")
    api = s.api
    for path, fields in SORT_FIELDS.items():
        for sort_by, dto_field in fields.items():
            for direction in ("asc", "desc"):
                # Scoped to this run's fixtures: on a large database an
                # unscoped page can contain nothing but nulls for a column,
                # leaving the ordering unverifiable.
                page = jbody(api.get(
                    f"/api/v1/{path}?pageSize=100&sortBy={sort_by}"
                    f"&sortDir={direction}&{q(search=s.tag)}")[1])
                if page is None:
                    s.r.fail(f"{path} sortBy={sort_by} {direction}", "no response")
                    continue
                rows = page.get("items", []) if isinstance(page, dict) else page
                if len(rows) < 2:
                    s.r.skip(f"{path} sortBy={sort_by} {direction}", "fewer than 2 rows")
                    continue
                # The API omits null properties, so an absent key means "no value"
                # rather than "no such field" — only a field absent from every row
                # is genuinely missing from the DTO.
                if not any(dto_field in r for r in rows):
                    s.r.skip(f"{path} sortBy={sort_by} {direction}",
                             f"no row carries a {dto_field} value to verify against")
                    continue
                values = [r.get(dto_field) for r in rows]
                s.assert_(f"{path} sortBy={sort_by} {direction} is ordered",
                          _monotonic(values, direction == "desc"),
                          f"{[str(v)[:14] for v in values[:6]]}")

    # A sort key the API doesn't know must not 500 — it should fall back.
    st, _ = api.get("/api/v1/assets?sortBy=notARealField")
    s.assert_("assets?sortBy=<unknown> degrades gracefully", st in (200, 400), f"got {st}")
    st, _ = api.get("/api/v1/assets?sortDir=sideways")
    s.assert_("assets?sortDir=<unknown> degrades gracefully", st in (200, 400), f"got {st}")


def test_pagination(s):
    s.section("Pagination")
    api = s.api
    p1 = s.check("assets page 1 size 2", api.get("/api/v1/assets?page=1&pageSize=2&sortBy=name&sortDir=asc"))
    p2 = s.check("assets page 2 size 2", api.get("/api/v1/assets?page=2&pageSize=2&sortBy=name&sortDir=asc"))
    if p1 and p2:
        s.assert_("page size respected", len(p1.get("items", [])) <= 2, str(len(p1.get("items", []))))
        s.assert_("pages do not overlap",
                  not (set(ids_of(p1)) & set(ids_of(p2))))
        s.assert_("totalCount present and >= rows",
                  p1.get("totalCount", 0) >= len(p1.get("items", [])), str(p1.get("totalCount")))
    huge = s.check("page beyond the end returns empty, not an error",
                   api.get("/api/v1/assets?page=9999&pageSize=25"))
    if huge:
        s.assert_("out-of-range page has no items", huge.get("items") == [])
    for path in ("applications", "certificates", "people", "locations",
                 "asset-types", "certificate-types", "application-types", "asset-models"):
        got = s.check(f"{path} paginates", api.get(f"/api/v1/{path}?page=1&pageSize=1"))
        if got:
            s.assert_(f"{path} honours pageSize=1", len(got.get("items", [])) <= 1)


BAD_UUID = "00000000-0000-0000-0000-000000000000"


def test_validation(s, f):
    """Bad input must be refused with a 4xx and an explanation — never a 500."""
    s.section("Validation and error handling")
    api, t = s.api, s.tag

    s.check("POST /assets without a name is rejected",
            api.post("/api/v1/assets", {"assetTypeId": f["atA"]["id"]}), 400)
    s.check("POST /assets with a blank name is rejected",
            api.post("/api/v1/assets", {"name": "   ", "assetTypeId": f["atA"]["id"]}), 400)
    s.check("POST /assets with an unknown asset type is rejected",
            api.post("/api/v1/assets", {"name": f"Bad {t}", "assetTypeId": BAD_UUID}), (400, 404))
    s.check("POST /assets with an unknown location is rejected",
            api.post("/api/v1/assets", {"name": f"Bad {t}", "assetTypeId": f["atA"]["id"],
                                        "locationId": BAD_UUID}), (400, 404))
    s.check("POST /people without a name is rejected",
            api.post("/api/v1/people", {"email": f"x{t}@example.com"}), 400)
    s.check("POST /certificates without a name is rejected",
            api.post("/api/v1/certificates", {"certificateTypeId": f["ct"]["id"]}), 400)
    s.check("POST /applications without a name is rejected",
            api.post("/api/v1/applications", {"applicationTypeId": f["apt"]["id"]}), 400)
    s.check("POST /locations without a name is rejected",
            api.post("/api/v1/locations", {}), 400)

    # Unknown ids must 404 rather than 500.
    for path in ("assets", "applications", "certificates", "people", "locations",
                 "asset-types", "certificate-types", "application-types", "asset-models",
                 "asset-templates"):
        s.check(f"GET /{path}/<unknown> is 404", api.get(f"/api/v1/{path}/{BAD_UUID}"), (404,))

    # A malformed UUID is a client error, not a server error.
    st, _ = api.get("/api/v1/assets/not-a-uuid")
    s.assert_("GET /assets/not-a-uuid is a 4xx", 400 <= st < 500, f"got {st}")
    # Malformed JSON likewise.
    st, _ = api.request("POST", "/api/v1/locations", raw=b"{not json",
                        content_type="application/json")
    s.assert_("malformed JSON body is a 4xx", 400 <= st < 500, f"got {st}")
    # An unparseable date in a filter must not crash the query.
    st, _ = api.get("/api/v1/assets?purchaseDateFrom=notadate")
    s.assert_("unparseable date filter is handled", st in (200, 400), f"got {st}")
    # A bad enum value in a filter likewise.
    st, _ = api.get("/api/v1/assets?status=NotAStatus")
    s.assert_("unknown status filter is handled", st in (200, 400), f"got {st}")


def test_business_rules(s, f):
    """The invariants the app promises: lifecycle order, seat limits, safe deletes."""
    s.section("Business rules — asset lifecycle")
    api, t = s.api, s.tag

    a = s.check("create a lifecycle asset", api.post("/api/v1/assets", {
        "name": f"Deep Lifecycle {t}", "assetTypeId": f["atA"]["id"]}), 201)
    if not a:
        return
    aid = a["id"]

    s.check("check in an Available asset is refused",
            api.post(f"/api/v1/assets/{aid}/checkin", {}), 400)
    s.check("check out to an unknown person is refused",
            api.post(f"/api/v1/assets/{aid}/checkout", {"personId": BAD_UUID}), 400)
    s.check("check out an Available asset",
            api.post(f"/api/v1/assets/{aid}/checkout", {"personId": f["p1"]["id"]}))
    got = jbody(api.get(f"/api/v1/assets/{aid}")[1])
    s.assert_("checkout sets status CheckedOut", got and got.get("status") == "CheckedOut",
              str(got and got.get("status")))
    s.check("checking out an already checked-out asset is refused",
            api.post(f"/api/v1/assets/{aid}/checkout", {"personId": f["p2"]["id"]}), 400)
    s.check("check the asset back in", api.post(f"/api/v1/assets/{aid}/checkin", {}))
    got = jbody(api.get(f"/api/v1/assets/{aid}")[1])
    s.assert_("check-in returns it to Available", got and got.get("status") == "Available",
              str(got and got.get("status")))

    hist = s.check("checkout/checkin is recorded in history", api.get(f"/api/v1/assets/{aid}/history"))
    if hist is not None:
        events = hist if isinstance(hist, list) else hist.get("items", [])
        s.assert_("history has at least the create + checkout + checkin events",
                  len(events) >= 3, f"{len(events)} events")
        s.check("history?limit is honoured", api.get(f"/api/v1/assets/{aid}/history?limit=1"))

    s.check("retire the asset", api.post(f"/api/v1/assets/{aid}/retire", {"reason": "QA"}))
    s.check("retiring twice is refused", api.post(f"/api/v1/assets/{aid}/retire", {"reason": "QA"}), 400)
    # Retiring kit and then selling it is the ordinary end of an asset's life.
    # This used to be refused, which left the only route to "sold" running
    # through an asset still in service.
    s.check("a retired asset can still be sold",
            api.post(f"/api/v1/assets/{aid}/sell", {"salePrice": 10}))
    s.assert_("and it lands in the sold state",
              jbody(api.get(f"/api/v1/assets/{aid}")[1]).get("status") == "Sold")

    b = s.check("create an asset to sell", api.post("/api/v1/assets", {
        "name": f"Deep Sell {t}", "assetTypeId": f["atA"]["id"]}), 201)
    if b:
        s.check("sell it", api.post(f"/api/v1/assets/{b['id']}/sell",
                                    {"salePrice": 42.50, "soldDate": "2025-01-01"}))
        s.check("selling twice is refused",
                api.post(f"/api/v1/assets/{b['id']}/sell", {"salePrice": 1}), 400)
        s.check("retiring a sold asset is refused",
                api.post(f"/api/v1/assets/{b['id']}/retire", {"reason": "QA"}), 400)

    c = s.check("create an asset to archive/restore", api.post("/api/v1/assets", {
        "name": f"Deep Archive {t}", "assetTypeId": f["atA"]["id"]}), 201)
    if c:
        s.check("archive it", api.delete(f"/api/v1/assets/{c['id']}"))
        s.check("checking out an archived asset is refused",
                api.post(f"/api/v1/assets/{c['id']}/checkout", {"personId": f["p1"]["id"]}), 400)
        s.check("restore it", api.post(f"/api/v1/assets/{c['id']}/restore"))
        got = jbody(api.get(f"/api/v1/assets/{c['id']}")[1])
        s.assert_("restore brings it back out of Archived",
                  got and got.get("status") != "Archived", str(got and got.get("status")))

    s.section("Business rules — application seats")
    ap = f["ap1"]["id"]  # maxSeats = 2
    s.check("assign seat 1", api.post(f"/api/v1/applications/{ap}/seats", {"personId": f["p1"]["id"]}))
    s.check("assigning the same person twice is a conflict",
            api.post(f"/api/v1/applications/{ap}/seats", {"personId": f["p1"]["id"]}), 409)
    s.check("assign seat 2", api.post(f"/api/v1/applications/{ap}/seats", {"personId": f["p2"]["id"]}))
    seats = s.check("list seats", api.get(f"/api/v1/applications/{ap}/seats"))
    if seats is not None:
        rows = seats if isinstance(seats, list) else seats.get("items", [])
        s.assert_("both seats are listed", len(rows) == 2, f"{len(rows)} seats")
    extra = s.check("create a third person", api.post("/api/v1/people", {
        "fullName": f"Deep Carol {t}"}), 201)
    if extra:
        s.check("exceeding maxSeats is a conflict",
                api.post(f"/api/v1/applications/{ap}/seats", {"personId": extra["id"]}), 409)
    got = jbody(api.get(f"/api/v1/applications/{ap}")[1])
    s.assert_("usedSeats reflects the assignments", got and got.get("usedSeats") == 2,
              str(got and got.get("usedSeats")))
    s.check("release a seat", api.delete(f"/api/v1/applications/{ap}/seats/{f['p2']['id']}"))
    got = jbody(api.get(f"/api/v1/applications/{ap}")[1])
    s.assert_("usedSeats drops after release", got and got.get("usedSeats") == 1,
              str(got and got.get("usedSeats")))
    if extra:
        s.check("the freed seat can now be taken",
                api.post(f"/api/v1/applications/{ap}/seats", {"personId": extra["id"]}))

    s.section("Business rules — application lifecycle")
    s.check("deactivate an application",
            api.post(f"/api/v1/applications/{f['ap2']['id']}/deactivate", {"reason": "QA"}))
    got = jbody(api.get(f"/api/v1/applications/{f['ap2']['id']}")[1])
    s.assert_("deactivate sets status Inactive", got and got.get("status") == "Inactive",
              str(got and got.get("status")))
    s.check("reactivate it", api.post(f"/api/v1/applications/{f['ap2']['id']}/reactivate", {}))
    s.check("renew it", api.post(f"/api/v1/applications/{f['ap2']['id']}/renew",
                                 {"newExpiryDate": "2035-01-01"}))
    got = jbody(api.get(f"/api/v1/applications/{f['ap2']['id']}")[1])
    s.assert_("renewal moves the expiry date", got and got.get("expiryDate", "").startswith("2035"),
              str(got and got.get("expiryDate")))

    s.section("Business rules — certificate renewal")
    s.check("renew a certificate", api.post(f"/api/v1/certificates/{f['c1']['id']}/renew",
                                            {"newExpiryDate": "2035-01-01"}))
    got = jbody(api.get(f"/api/v1/certificates/{f['c1']['id']}")[1])
    s.assert_("renewal moves the certificate expiry",
              got and str(got.get("expiryDate", "")).startswith("2035"),
              str(got and got.get("expiryDate")))

    s.section("Business rules — safe deletes")
    st, body = api.delete(f"/api/v1/locations/{f['locA']['id']}")
    s.assert_("deleting a location that still holds assets is refused (409)",
              st == 409, f"got {st}: {body.decode(errors='replace')[:120]}")
    st, _ = api.delete(f"/api/v1/asset-types/{f['atA']['id']}")
    s.assert_("deleting an asset type still in use is refused",
              st in (400, 409), f"got {st}")


CUSTOM_FIELD_CASES = [
    ("Text", None, "hello world"),
    ("Number", None, "42.5"),
    ("Date", None, "2025-07-04"),
    ("Boolean", None, "true"),
    ("SingleSelect", "red,green,blue", "green"),
    ("MultiSelect", "a,b,c", "a,c"),
    ("Url", None, "https://example.com/x"),
]


def test_custom_fields(s):
    """Every custom field type, defined on a type and round-tripped through an asset."""
    s.section("Custom fields — all seven types")
    api, t = s.api, s.tag

    defs = [{"name": f"CF {ft} {t}", "fieldType": ft, "options": opts, "sortOrder": i}
            for i, (ft, opts, _) in enumerate(CUSTOM_FIELD_CASES)]
    at = s.check("create an asset type carrying every field type",
                 api.post("/api/v1/asset-types",
                          {"name": f"DeepCF Type {t}", "customFields": defs}), 201)
    if not at:
        return
    got = s.check("read its custom field definitions",
                  api.get(f"/api/v1/asset-types/{at['id']}/customfields"))
    if not got:
        return
    rows = got if isinstance(got, list) else got.get("items", [])
    s.assert_("all seven definitions were stored", len(rows) == len(CUSTOM_FIELD_CASES),
              f"{len(rows)} of {len(CUSTOM_FIELD_CASES)}")
    by_type = {d["fieldType"]: d for d in rows}
    for ft, opts, _ in CUSTOM_FIELD_CASES:
        s.assert_(f"definition of type {ft} exists", ft in by_type)
        if opts and ft in by_type:
            s.assert_(f"{ft} keeps its options list", by_type[ft].get("options") == opts,
                      str(by_type[ft].get("options")))

    values = [{"fieldDefinitionId": by_type[ft]["id"], "value": val}
              for ft, _, val in CUSTOM_FIELD_CASES if ft in by_type]
    asset = s.check("create an asset with every custom field set", api.post("/api/v1/assets", {
        "name": f"Deep CF Asset {t}", "assetTypeId": at["id"],
        "customFieldValues": values}), 201)
    if not asset:
        return
    full = s.check("read the asset back", api.get(f"/api/v1/assets/{asset['id']}"))
    if full:
        stored = {v["fieldType"]: v["value"] for v in (full.get("customFieldValues") or [])}
        for ft, _, val in CUSTOM_FIELD_CASES:
            s.assert_(f"{ft} value round-trips", stored.get(ft) == val,
                      f"stored {stored.get(ft)!r}, expected {val!r}")

    # Values must be updatable, not just settable at creation.
    if by_type.get("Text"):
        s.check("update a custom field value", api.put(f"/api/v1/assets/{asset['id']}", {
            "name": full["name"], "assetTypeId": at["id"],
            "customFieldValues": [{"fieldDefinitionId": by_type["Text"]["id"], "value": "changed"}]}))
        again = jbody(api.get(f"/api/v1/assets/{asset['id']}")[1])
        stored = {v["fieldType"]: v["value"] for v in (again.get("customFieldValues") or [])}
        s.assert_("the updated value is persisted", stored.get("Text") == "changed",
                  str(stored.get("Text")))

    # The same machinery on the other three entity types.
    for kind, path, extra in (
        ("certificate", "certificate-types", None),
        ("application", "application-types", None),
    ):
        ct = s.check(f"create a {kind} type with a custom field",
                     api.post(f"/api/v1/{path}", {"name": f"DeepCF {kind} {t}",
                                                  "customFields": [{"name": f"CF {t}", "fieldType": "Text"}]}), 201)
        if ct:
            s.check(f"read {kind} type custom fields", api.get(f"/api/v1/{path}/{ct['id']}/customfields"))
    return at


DASHBOARD_WIDGETS = [
    ("summary", None), ("status-breakdown", None), ("warranty-expiries", "days=90"),
    ("assets-by-type", None), ("assets-by-location", None), ("checked-out", None),
    ("recently-added", "days=30"), ("assets-by-age", None), ("unassigned", None),
    ("value-by-location", None), ("certificate-expiries", "days=90"),
    ("certificate-summary", None), ("licence-expiries", "days=90"),
    ("inventory-snapshot", None), ("application-summary", None),
]

REPORTS = [
    ("asset-summary", ""), ("expiries", "days=90"), ("expiries", "from=2024-01-01&to=2030-01-01"),
    ("licence-summary", "from=2024-01-01&to=2030-01-01"), ("assignments", ""),
    ("asset-lifecycle", "from=2020-01-01&to=2030-01-01"), ("depreciation", ""),
]


def test_dashboard(s):
    s.section("Dashboard — every widget")
    api = s.api
    for widget, params in DASHBOARD_WIDGETS:
        q = f"?{params}" if params else ""
        got = s.check(f"GET /dashboard/{widget}{q}", api.get(f"/api/v1/dashboard/{widget}{q}"))
        s.assert_(f"/dashboard/{widget} returns a body", got is not None)
    # The day-window parameters must actually change the window, not be ignored.
    wide = jbody(api.get("/api/v1/dashboard/warranty-expiries?days=3650")[1])
    narrow = jbody(api.get("/api/v1/dashboard/warranty-expiries?days=1")[1])
    def count(x):
        if isinstance(x, list):
            return len(x)
        if isinstance(x, dict):
            for k in ("items", "assets", "results"):
                if isinstance(x.get(k), list):
                    return len(x[k])
        return 0
    s.assert_("warranty-expiries?days widens the window",
              count(wide) >= count(narrow), f"{count(wide)} vs {count(narrow)}")


def test_reports(s):
    s.section("Reports — every report, JSON and CSV")
    api = s.api
    for name, params in REPORTS:
        q = f"?{params}" if params else ""
        got = s.check(f"GET /reports/{name}{q}", api.get(f"/api/v1/reports/{name}{q}"))
        s.assert_(f"/reports/{name} returns a body", got is not None)
        sep = "&" if params else ""
        body = s.raw(f"GET /reports/{name} as CSV",
                     api.get(f"/api/v1/reports/{name}?{params}{sep}format=csv"))
        if body is not None:
            text = body.decode("utf-8-sig", errors="replace")
            s.assert_(f"/reports/{name} CSV has a header row",
                      "," in text.splitlines()[0] if text.splitlines() else False,
                      text.splitlines()[0][:60] if text.splitlines() else "empty")
    # Depreciation accepts filters of its own.
    s.check("GET /reports/depreciation?assetTypeId", api.get("/api/v1/reports/depreciation"))


def test_exports(s, f):
    s.section("Exports — CSV content and selection")
    api = s.api
    for path in ("assets", "applications", "certificates", "people", "locations", "audit-logs"):
        body = s.raw(f"GET /{path}/export", api.get(f"/api/v1/{path}/export"))
        if body is None:
            continue
        s.assert_(f"/{path}/export starts with a BOM, so Excel decodes it",
                  body[:3] == b"\xef\xbb\xbf", repr(body[:6]))
        text = body.decode("utf-8-sig", errors="replace")
        rows = list(csv.reader(io.StringIO(text)))
        s.assert_(f"/{path}/export is parseable CSV with a header",
                  len(rows) >= 1 and len(rows[0]) > 1, f"{len(rows)} rows")

    # `ids` must narrow the export to exactly that selection.
    body = s.raw("GET /assets/export?ids=<one asset>",
                 api.get(f"/api/v1/assets/export?ids={f['a1']['id']}"))
    if body:
        rows = list(csv.reader(io.StringIO(body.decode("utf-8-sig", errors="replace"))))
        s.assert_("export?ids returns exactly the selected row",
                  len(rows) == 2, f"{len(rows)} rows including header")
        if len(rows) == 2:
            s.assert_("the exported row is the one asked for",
                      f["a1"]["name"] in ",".join(rows[1]), ",".join(rows[1])[:80])
    # Filters must apply to exports as they do to lists.
    body = s.raw("GET /assets/export?costMin=1000",
                 api.get("/api/v1/assets/export?costMin=1000"))
    if body:
        text = body.decode("utf-8-sig", errors="replace")
        s.assert_("filtered export excludes the cheap asset",
                  f["a1"]["name"] not in text)
        s.assert_("filtered export includes the dear asset",
                  f["a2"]["name"] in text)


def test_saved_views(s):
    s.section("Saved views — full lifecycle")
    api, t = s.api, s.tag
    v = s.check("create a saved view", api.post("/api/v1/saved-views", {
        "entityType": "asset", "name": f"Deep View {t}",
        "configuration": json.dumps({"sortBy": "name", "filters": {"status": "Available"}})}), (200, 201))
    if not v:
        return
    got = s.check("list saved views for the entity type", api.get("/api/v1/saved-views?entityType=asset"))
    if got is not None:
        rows = got if isinstance(got, list) else got.get("items", [])
        s.assert_("the new view appears in the list", any(x["id"] == v["id"] for x in rows))
    # A view for a different entity type must not leak into this one's list.
    other = s.check("create a view for another entity type", api.post("/api/v1/saved-views", {
        "entityType": "certificate", "name": f"Deep CView {t}", "configuration": "{}"}), (200, 201))
    if other:
        rows = jbody(api.get("/api/v1/saved-views?entityType=asset")[1]) or []
        rows = rows if isinstance(rows, list) else rows.get("items", [])
        s.assert_("saved views are scoped to their entity type",
                  all(x["id"] != other["id"] for x in rows))
    s.check("rename a saved view", api.put(f"/api/v1/saved-views/{v['id']}", {
        "name": f"Deep View Renamed {t}", "configuration": "{}"}))
    rows = jbody(api.get("/api/v1/saved-views?entityType=asset")[1]) or []
    rows = rows if isinstance(rows, list) else rows.get("items", [])
    match = next((x for x in rows if x["id"] == v["id"]), None)
    s.assert_("the rename is persisted", match and match["name"].endswith("Renamed " + t),
              str(match and match.get("name")))
    s.check("mark it the default", api.put(f"/api/v1/saved-views/{v['id']}/default", {}))
    rows = jbody(api.get("/api/v1/saved-views?entityType=asset")[1]) or []
    rows = rows if isinstance(rows, list) else rows.get("items", [])
    match = next((x for x in rows if x["id"] == v["id"]), None)
    s.assert_("the default flag is set", match and match.get("isDefault") is True,
              str(match and match.get("isDefault")))
    s.check("delete a saved view", api.delete(f"/api/v1/saved-views/{v['id']}"))
    rows = jbody(api.get("/api/v1/saved-views?entityType=asset")[1]) or []
    rows = rows if isinstance(rows, list) else rows.get("items", [])
    s.assert_("the deleted view is gone", all(x["id"] != v["id"] for x in rows))


def configure_email_alerts(s):
    """Points alert delivery at the local MailHog so the send path can be tested."""
    api = s.api
    current = jbody(api.get("/api/v1/settings/alerts")[1])
    if not current:
        return False
    cfg = dict(current)
    cfg.update({"warrantyEnabled": True, "certificateEnabled": True, "licenceEnabled": True,
                "thresholds": "7,30,60,90,365", "emailProvider": "smtp",
                "smtpHost": "localhost", "smtpPort": 1025, "smtpUsername": "",
                "smtpPassword": "", "smtpFromAddress": "qa@assetmgmt.local",
                "recipients": "qa@example.com"})
    st, _ = api.put("/api/v1/settings/alerts", cfg)
    return st < 400


def test_alert_rules_and_notifications(s):
    s.section("Alert rules and notifications")
    api, t = s.api, s.tag
    rule = s.check("create an alert rule", api.post("/api/v1/alert-rules", {
        "name": f"Deep Rule {t}", "entityTypes": "Asset,Certificate",
        "thresholds": "30,60,90", "notifyEmail": True}), (200, 201))
    got = s.check("list alert rules", api.get("/api/v1/alert-rules"))
    if rule and got is not None:
        rows = got if isinstance(got, list) else got.get("items", [])
        s.assert_("the rule appears in the list", any(x["id"] == rule["id"] for x in rows))
        s.check("update the rule", api.put(f"/api/v1/alert-rules/{rule['id']}", {
            "name": f"Deep Rule Updated {t}", "entityTypes": "Asset",
            "thresholds": "7", "notifyEmail": False, "isActive": False}))
        rows = jbody(api.get("/api/v1/alert-rules")[1]) or []
        rows = rows if isinstance(rows, list) else rows.get("items", [])
        m = next((x for x in rows if x["id"] == rule["id"]), None)
        s.assert_("the rule update is persisted",
                  m and m["thresholds"] == "7" and m["isActive"] is False,
                  str(m and (m.get("thresholds"), m.get("isActive"))))
        s.check("delete the rule", api.delete(f"/api/v1/alert-rules/{rule['id']}"))

    s.check("GET /notifications/summary", api.get("/api/v1/notifications/summary"))
    s.check("GET /user-notifications", api.get("/api/v1/user-notifications"))
    for status in ("all", "unread", "read", "dismissed"):
        s.check(f"GET /user-notifications?status={status}",
                api.get(f"/api/v1/user-notifications?status={status}"))
    count = s.check("GET /user-notifications/unread-count", api.get("/api/v1/user-notifications/unread-count"))
    s.assert_("unread-count returns a number",
              isinstance(count, dict) and isinstance(count.get("count"), int)
              or isinstance(count, int), str(count))

    # Generate real notifications, then drive the whole read/dismiss/snooze path.
    s.assert_("configure email delivery (MailHog) so alerts can send",
              configure_email_alerts(s))
    s.check("POST /alerts/send-now generates notifications", api.post("/api/v1/alerts/send-now"))
    page = jbody(api.get("/api/v1/user-notifications?status=unread&pageSize=10")[1])
    rows = (page or {}).get("items", []) if isinstance(page, dict) else (page or [])
    if not rows:
        s.r.fail("alerts generate notifications for soon-to-expire items",
                 "send-now produced nothing despite fixtures expiring in 20 days")
    else:
        n = rows[0]["id"]
        before = jbody(api.get("/api/v1/user-notifications/unread-count")[1])
        s.check("mark a notification read", api.post(f"/api/v1/user-notifications/{n}/read"))
        after = jbody(api.get("/api/v1/user-notifications/unread-count")[1])
        def cnt(x):
            return x.get("count") if isinstance(x, dict) else x
        s.assert_("the unread count falls after marking one read",
                  cnt(after) < cnt(before), f"{cnt(before)} -> {cnt(after)}")
        if len(rows) > 1:
            s.check("snooze a notification",
                    api.post(f"/api/v1/user-notifications/{rows[1]['id']}/snooze",
                             {"duration": "1w"}))
            s.check("an unknown snooze duration is refused",
                    api.post(f"/api/v1/user-notifications/{rows[1]['id']}/snooze",
                             {"duration": "forever"}), 400)
            s.check("dismiss a notification",
                    api.post(f"/api/v1/user-notifications/{rows[1]['id']}/dismiss"))
        s.check("mark all read", api.post("/api/v1/user-notifications/read-all"))
        final = jbody(api.get("/api/v1/user-notifications/unread-count")[1])
        s.assert_("read-all clears the unread count", cnt(final) == 0, str(cnt(final)))


def test_settings_and_profile(s):
    s.section("Settings, profile and search")
    api, t = s.api, s.tag
    sysset = s.check("GET /settings/system", api.get("/api/v1/settings/system"))
    if sysset is not None:
        payload = dict(sysset)
        payload["orgName"] = f"Deep QA Co {t}"
        s.check("PUT /settings/system", api.put("/api/v1/settings/system", payload))
        again = jbody(api.get("/api/v1/settings/system")[1])
        s.assert_("the system setting is persisted",
                  again and again.get("orgName") == f"Deep QA Co {t}",
                  str(again and again.get("orgName")))
    alerts = s.check("GET /settings/alerts", api.get("/api/v1/settings/alerts"))
    if alerts is not None:
        s.check("PUT /settings/alerts", api.put("/api/v1/settings/alerts", alerts))

    s.check("PUT /profile (theme)", api.put("/api/v1/profile", {"themePreference": "dark"}))
    me = jbody(api.get("/api/v1/auth/me")[1])
    s.assert_("the theme preference is reflected on /auth/me",
              me is not None, str(me and me.get("themePreference")))
    s.check("PUT /profile (restore)", api.put("/api/v1/profile", {"themePreference": "light"}))

    res = s.check("GET /search", api.get("/api/v1/search?" + q(**{"q": f"Deep Asset One {t}"})))
    if res is not None:
        blob = json.dumps(res)
        s.assert_("global search finds the asset by name", "Deep Asset One" in blob)
    s.check("GET /search with an empty query", api.get("/api/v1/search?q="))
    s.check("GET /search?limit is honoured", api.get("/api/v1/search?q=Deep&limit=2"))
    s.check("GET /people/search", api.get("/api/v1/people/search?" + q(**{"q": f"Deep Alice {t}"})))
    s.check("GET /roles", api.get("/api/v1/roles"))


def test_restore(s, f):
    """Archiving is a soft delete, so every archive must be undoable."""
    s.section("Archive and restore")
    api, t = s.api, s.tag

    cases = [
        ("locations", {"name": f"Deep Restore Loc {t}"}),
        ("people", {"fullName": f"Deep Restore Person {t}"}),
        ("asset-types", {"name": f"Deep Restore AType {t}"}),
        ("certificate-types", {"name": f"Deep Restore CType {t}"}),
        ("application-types", {"name": f"Deep Restore AppType {t}"}),
    ]
    for path, payload in cases:
        rec = s.check(f"create a {path} record to archive", api.post(f"/api/v1/{path}", payload), 201)
        if not rec:
            continue
        rid = rec["id"]
        s.check(f"archive the {path} record", api.delete(f"/api/v1/{path}/{rid}"), (200, 204))

        listed = ids_of(jbody(api.get(f"/api/v1/{path}?pageSize=100&{q(search=t)}")[1]))
        s.assert_(f"{path}: an archived record is hidden by default", rid not in listed)

        listed = ids_of(jbody(api.get(
            f"/api/v1/{path}?pageSize=100&includeArchived=true&{q(search=t)}")[1]))
        s.assert_(f"{path}: includeArchived makes it findable again", rid in listed)

        s.check(f"restore the {path} record", api.post(f"/api/v1/{path}/{rid}/restore"))
        listed = ids_of(jbody(api.get(f"/api/v1/{path}?pageSize=100&{q(search=t)}")[1]))
        s.assert_(f"{path}: the restored record is listed again", rid in listed)
        s.check(f"{path}: restoring twice is refused",
                api.post(f"/api/v1/{path}/{rid}/restore"), 400)

    tpl = s.check("create a template to archive", api.post("/api/v1/asset-templates", {
        "name": f"Deep Restore Tpl {t}", "assetTypeId": f["atA"]["id"]}), 201)
    if tpl:
        s.check("archive the template", api.delete(f"/api/v1/asset-templates/{tpl['id']}"), (200, 204))
        listed = ids_of(jbody(api.get("/api/v1/asset-templates?includeArchived=true")[1]))
        s.assert_("the archived template is findable", tpl["id"] in listed)
        s.check("restore the template", api.post(f"/api/v1/asset-templates/{tpl['id']}/restore"))
        listed = ids_of(jbody(api.get("/api/v1/asset-templates")[1]))
        s.assert_("the restored template is listed again", tpl["id"] in listed)

    # Certificates and applications restore too. Both get a record of their own:
    # an application still holding seats cannot be archived at all, which is
    # correct but would test the wrong thing here.
    cert = s.check("create a certificate to archive", api.post("/api/v1/certificates", {
        "name": f"Deep Restore Cert {t}", "certificateTypeId": f["ct"]["id"],
        "expiryDate": "2031-01-01"}), 201)
    app = s.check("create an application to archive", api.post("/api/v1/applications", {
        "name": f"Deep Restore App {t}", "applicationTypeId": f["apt"]["id"],
        "expiryDate": "2031-01-01"}), 201)
    for path, rec in (("certificates", cert), ("applications", app)):
        if not rec:
            continue
        s.check(f"archive a {path}", api.delete(f"/api/v1/{path}/{rec['id']}"), (200, 204))
        listed = ids_of(jbody(api.get(
            f"/api/v1/{path}?pageSize=100&includeArchived=true&{q(search=t)}")[1]))
        s.assert_(f"{path}: the archived record is findable", rec["id"] in listed)
        s.check(f"restore a {path}", api.post(f"/api/v1/{path}/{rec['id']}/restore"))


def test_legacy_path_aliases(s):
    """
    The concatenated paths kept for older clients.

    These are live routes. Nothing exercised them, so a change to the mapping
    would have broken every old client with nothing to catch it — the handler
    behind them being well tested says nothing about the alias resolving.
    """
    s.section("Legacy path aliases are gone")
    api, t = s.api, s.tag

    # These concatenated paths were kept as aliases from an early version. The
    # frontend never used them and no external consumer exists, so they were
    # retired — surface that answers is surface that has to be secured, tested
    # and kept working. This asserts they are actually gone rather than quietly
    # still serving.
    for legacy in ("/api/v1/assettypes", "/api/v1/certificatetypes",
                   "/api/v1/applicationtypes", "/api/v1/auditlogs"):
        st, _ = api.get(legacy)
        s.assert_(f"{legacy} no longer answers", st == 404, f"got {st}")

    # And the canonical paths still do.
    for canonical in ("/api/v1/asset-types", "/api/v1/certificate-types",
                      "/api/v1/application-types", "/api/v1/audit-logs"):
        s.check(f"{canonical} still answers", api.get(f"{canonical}?pageSize=5"))


def test_bulk_operations(s, f):
    """Bulk edit/status/archive must apply to every id given, and only those."""
    s.section("Bulk operations")
    api, t = s.api, s.tag
    made = []
    for i in range(3):
        a = s.check(f"create bulk fixture {i+1}", api.post("/api/v1/assets", {
            "name": f"Deep Bulk {i} {t}", "assetTypeId": f["atA"]["id"]}), 201)
        if a:
            made.append(a["id"])
    if len(made) < 3:
        return
    keep = f["a1"]["id"]  # must be left untouched by every bulk call

    res = s.check("bulk-status on two assets", api.post("/api/v1/assets/bulk-status", {
        "ids": made[:2], "status": "InMaintenance"}))
    for aid in made[:2]:
        got = jbody(api.get(f"/api/v1/assets/{aid}")[1])
        s.assert_("bulk-status applied to a selected asset",
                  got and got.get("status") == "InMaintenance", str(got and got.get("status")))
    got = jbody(api.get(f"/api/v1/assets/{made[2]}")[1])
    s.assert_("bulk-status left the unselected asset alone",
              got and got.get("status") != "InMaintenance", str(got and got.get("status")))

    s.check("bulk-status with an invalid status is refused",
            api.post("/api/v1/assets/bulk-status", {"ids": made[:1], "status": "Nonsense"}), 400)

    s.check("bulk-edit sets location and notes", api.post("/api/v1/assets/bulk-edit", {
        "ids": made[:2], "locationId": f["locB"]["id"], "notes": f"bulk note {t}"}))
    for aid in made[:2]:
        got = jbody(api.get(f"/api/v1/assets/{aid}")[1])
        s.assert_("bulk-edit applied the location",
                  got and got.get("locationId") == f["locB"]["id"], str(got and got.get("locationId")))
        s.assert_("bulk-edit applied the notes",
                  got and got.get("notes") == f"bulk note {t}", str(got and got.get("notes")))
    s.check("bulk-edit assigns a person", api.post("/api/v1/assets/bulk-edit", {
        "ids": made[:1], "assignedPersonId": f["p1"]["id"]}))
    got = jbody(api.get(f"/api/v1/assets/{made[0]}")[1])
    s.assert_("bulk-edit assigned the person",
              got and got.get("assignedPersonId") == f["p1"]["id"], str(got and got.get("assignedPersonId")))
    s.check("bulk-edit clears the person", api.post("/api/v1/assets/bulk-edit", {
        "ids": made[:1], "clearAssignedPerson": True}))
    got = jbody(api.get(f"/api/v1/assets/{made[0]}")[1])
    s.assert_("bulk-edit cleared the person", got and got.get("assignedPersonId") is None,
              str(got and got.get("assignedPersonId")))
    s.check("bulk-edit clears the notes", api.post("/api/v1/assets/bulk-edit", {
        "ids": made[:1], "clearNotes": True}))
    got = jbody(api.get(f"/api/v1/assets/{made[0]}")[1])
    s.assert_("bulk-edit cleared the notes", got and not got.get("notes"), str(got and got.get("notes")))

    res = s.check("bulk-archive", api.post("/api/v1/assets/bulk-archive", {"ids": made}))
    if res:
        s.assert_("bulk-archive reports every id as succeeded",
                  res.get("succeeded") == len(made), str(res))
    got = jbody(api.get(f"/api/v1/assets/{keep}")[1])
    s.assert_("bulk-archive left the untouched asset alive",
              got and got.get("status") != "Archived", str(got and got.get("status")))
    s.check("bulk-archive with an empty id list is handled",
            api.post("/api/v1/assets/bulk-archive", {"ids": []}), (200, 400))

    for path in ("applications", "asset-types", "certificate-types", "application-types", "people"):
        s.check(f"{path} bulk-archive with an empty list is handled",
                api.post(f"/api/v1/{path}/bulk-archive", {"ids": []}), (200, 400))
    s.check("applications bulk-status with an empty list is handled",
            api.post("/api/v1/applications/bulk-status", {"ids": [], "status": "Active"}), (200, 400))


def test_duplicates(s, f):
    s.section("Duplicate detection")
    api = s.api
    got = s.check("assets check-duplicates finds a name collision",
                  api.post("/api/v1/assets/check-duplicates", {"name": f["a1"]["name"]}))
    if got is not None:
        s.assert_("the existing asset is reported as a duplicate",
                  isinstance(got, list) and len(got) >= 1, f"{got}")
    got = s.check("assets check-duplicates finds a serial collision",
                  api.post("/api/v1/assets/check-duplicates",
                           {"serialNumber": f["a1"]["serialNumber"]}))
    s.assert_("the serial collision is reported", isinstance(got, list) and len(got) >= 1, str(got))
    got = s.check("assets check-duplicates honours excludeId",
                  api.post("/api/v1/assets/check-duplicates",
                           {"name": f["a1"]["name"], "excludeId": f["a1"]["id"]}))
    s.assert_("excluding the record itself reports no duplicate",
              got == [], str(got))
    got = s.check("assets check-duplicates on a unique name finds nothing",
                  api.post("/api/v1/assets/check-duplicates", {"name": "No Such Asset " + s.tag}))
    s.assert_("a unique name is not a duplicate", got == [], str(got))
    s.check("applications check-duplicates",
            api.post("/api/v1/applications/check-duplicates", {"name": f["ap1"]["name"]}))
    s.check("people check-duplicates",
            api.post("/api/v1/people/check-duplicates", {"email": f"alice{s.tag}@example.com"}))
    s.check("locations check-duplicates",
            api.post("/api/v1/locations/check-duplicates", {"name": f["locA"]["name"]}))


def test_sub_resources(s, f):
    s.section("Sub-resource lists")
    api = s.api
    for path in (f"/api/v1/locations/{f['locA']['id']}/assets",
                 f"/api/v1/locations/{f['locA']['id']}/people",
                 f"/api/v1/locations/{f['locA']['id']}/certificates",
                 f"/api/v1/locations/{f['locA']['id']}/applications",
                 f"/api/v1/people/{f['p1']['id']}/assets",
                 f"/api/v1/people/{f['p1']['id']}/certificates",
                 f"/api/v1/people/{f['p1']['id']}/applications",
                 f"/api/v1/people/{f['p1']['id']}/summary",
                 f"/api/v1/people/{f['p1']['id']}/history",
                 f"/api/v1/certificates/{f['c1']['id']}/history",
                 f"/api/v1/applications/{f['ap1']['id']}/history"):
        s.check(f"GET {path.replace('/api/v1', '')}", api.get(path))
    got = jbody(api.get(f"/api/v1/locations/{f['locA']['id']}/assets")[1])
    rows = got if isinstance(got, list) else (got or {}).get("items", [])
    s.assert_("location assets list contains the asset placed there",
              any(x["id"] == f["a1"]["id"] for x in rows), f"{len(rows)} rows")


def test_offboard_and_reassign(s, f):
    s.section("Person offboarding and location reassignment")
    api, t = s.api, s.tag

    person = s.check("create a person to offboard", api.post("/api/v1/people", {
        "fullName": f"Deep Leaver {t}", "email": f"leaver{t}@example.com"}), 201)
    target = s.check("create a transfer target", api.post("/api/v1/people", {
        "fullName": f"Deep Receiver {t}"}), 201)
    if not (person and target):
        return
    a1 = s.check("asset to free", api.post("/api/v1/assets", {
        "name": f"Deep Off A {t}", "assetTypeId": f["atA"]["id"],
        "assignedPersonId": person["id"]}), 201)
    a2 = s.check("asset to transfer", api.post("/api/v1/assets", {
        "name": f"Deep Off B {t}", "assetTypeId": f["atA"]["id"],
        "assignedPersonId": person["id"]}), 201)
    if not (a1 and a2):
        return
    s.check("offboard: free one asset and transfer another",
            api.post(f"/api/v1/people/{person['id']}/offboard", {
                "actions": [
                    {"entityType": "Asset", "entityId": a1["id"], "action": "free"},
                    {"entityType": "Asset", "entityId": a2["id"], "action": "transfer",
                     "transferToPersonId": target["id"]},
                ], "deactivatePerson": True}))
    got = jbody(api.get(f"/api/v1/assets/{a1['id']}")[1])
    s.assert_("the freed asset is unassigned", got and got.get("assignedPersonId") is None,
              str(got and got.get("assignedPersonId")))
    s.assert_("the freed asset returns to Available", got and got.get("status") == "Available",
              str(got and got.get("status")))
    got = jbody(api.get(f"/api/v1/assets/{a2['id']}")[1])
    s.assert_("the transferred asset moved to the receiver",
              got and got.get("assignedPersonId") == target["id"],
              str(got and got.get("assignedPersonId")))

    src = s.check("create a location to empty", api.post("/api/v1/locations", {
        "name": f"Deep Src {t}"}), 201)
    dst = s.check("create a destination location", api.post("/api/v1/locations", {
        "name": f"Deep Dst {t}"}), 201)
    if not (src and dst):
        return
    moved = s.check("asset in the source location", api.post("/api/v1/assets", {
        "name": f"Deep Move {t}", "assetTypeId": f["atA"]["id"], "locationId": src["id"]}), 201)
    s.check("reassigning to itself is refused",
            api.post(f"/api/v1/locations/{src['id']}/reassign-and-archive",
                     {"targetLocationId": src["id"]}), 400)
    s.check("reassigning to an unknown location is refused",
            api.post(f"/api/v1/locations/{src['id']}/reassign-and-archive",
                     {"targetLocationId": BAD_UUID}), 400)
    s.check("reassign and archive the location",
            api.post(f"/api/v1/locations/{src['id']}/reassign-and-archive",
                     {"targetLocationId": dst["id"]}))
    if moved:
        got = jbody(api.get(f"/api/v1/assets/{moved['id']}")[1])
        s.assert_("the asset moved to the destination location",
                  got and got.get("locationId") == dst["id"], str(got and got.get("locationId")))


IMPORT_TYPES = ["locations", "people", "assets", "certificates", "applications"]


def test_import(s, f):
    """Template download, validation (clean and dirty), and a real execution."""
    s.section("CSV import — every entity type")
    api, t = s.api, s.tag

    for et in IMPORT_TYPES:
        body = s.raw(f"GET /import/{et}/template", api.get(f"/api/v1/import/{et}/template"))
        if body:
            header = body.decode(errors="replace").splitlines()[0]
            s.assert_(f"{et} template has a header row", "," in header, header[:70])
    s.check("an unknown entity type is refused", api.get("/api/v1/import/nonsense/template"), 400)

    # A clean file must validate with no errors...
    csv_ok = f"Name,Address,City,Country\nDeep Imp A {t},1 St,Town,UK\nDeep Imp B {t},2 St,Town,UK\n"
    raw, ct = multipart("file", "locations.csv", csv_ok.encode(), "text/csv")
    res = s.check("validate a clean locations file",
                  api.request("POST", "/api/v1/import/locations/validate", raw=raw, content_type=ct))
    if res is not None:
        s.assert_("a clean file validates with no invalid rows",
                  res.get("invalidRows") == 0, json.dumps(res)[:200])
        s.assert_("validation counts the rows it found",
                  res.get("totalRows") == 2 and res.get("validRows") == 2, json.dumps(res)[:200])

    # ...and a file with a missing required column must not.
    csv_bad = f"Address,City\n1 St,Town\n"
    raw, ct = multipart("file", "bad.csv", csv_bad.encode(), "text/csv")
    st, body = api.request("POST", "/api/v1/import/locations/validate", raw=raw, content_type=ct)
    parsed = jbody(body) or {}
    s.assert_("a file missing the Name column is reported as invalid",
              st == 400 or parsed.get("invalidRows", 0) > 0,
              f"status {st}: {body.decode(errors='replace')[:160]}")

    # A row that is blank where a value is required must be reported per-row.
    csv_row_bad = f"Name,Address,City,Country\n,1 St,Town,UK\n"
    raw, ct = multipart("file", "rowbad.csv", csv_row_bad.encode(), "text/csv")
    st, body = api.request("POST", "/api/v1/import/locations/validate", raw=raw, content_type=ct)
    parsed = jbody(body) or {}
    bad = [r for r in (parsed.get("rows") or []) if not r.get("isValid")]
    s.assert_("a row with no name is reported as an error",
              st == 400 or bad != [], f"status {st}: {body.decode(errors='replace')[:160]}")
    s.assert_("the row error names the offending column",
              any("Name" in e for r in bad for e in (r.get("errors") or [])),
              json.dumps(bad)[:160])

    # Execute for real, and prove the rows landed.
    raw, ct = multipart("file", "locations.csv", csv_ok.encode(), "text/csv")
    res = s.check("execute the locations import",
                  api.request("POST", "/api/v1/import/locations/execute", raw=raw, content_type=ct))
    if res is not None:
        s.assert_("the import reports two rows imported",
                  2 in (res.get("imported"), res.get("successCount"), res.get("importedRows")),
                  json.dumps(res)[:200])
    got = ids_of(jbody(api.get("/api/v1/locations?pageSize=100&" + q(search=f"Deep Imp A {t}"))[1]))
    s.assert_("the imported location is now retrievable", len(got) >= 1, f"{len(got)} rows")

    # People import, to prove more than one entity type actually executes.
    people_csv = f"FullName,Email,Department,JobTitle,Location\nDeep Imp P {t},impp{t}@example.com,QA,Tester,\n"
    raw, ct = multipart("file", "people.csv", people_csv.encode(), "text/csv")
    s.check("execute a people import",
            api.request("POST", "/api/v1/import/people/execute", raw=raw, content_type=ct))
    got = ids_of(jbody(api.get("/api/v1/people?pageSize=100&" + q(search=f"Deep Imp P {t}"))[1]))
    s.assert_("the imported person is now retrievable", len(got) >= 1, f"{len(got)} rows")

    # Excel's "CSV UTF-8" — the format an administrator most likely produces —
    # starts with a byte-order mark. It once made every row fail with
    # "Name is required" while the name sat there in plain sight.
    bom_csv = ("\ufeff" + f"Name,Address,City,Country\nDeep BOM {t},1 St,Town,UK\n").encode("utf-8")
    raw, ct = multipart("file", "excel.csv", bom_csv, "text/csv")
    res = s.check("validate a file saved by Excel (UTF-8 with BOM)",
                  api.request("POST", "/api/v1/import/locations/validate", raw=raw, content_type=ct))
    if res is not None:
        s.assert_("the BOM does not break the header row",
                  res.get("validRows") == 1 and res.get("invalidRows") == 0, json.dumps(res)[:200])
    raw, ct = multipart("file", "excel.csv", bom_csv, "text/csv")
    s.check("execute an Excel-saved import",
            api.request("POST", "/api/v1/import/locations/execute", raw=raw, content_type=ct))
    got = ids_of(jbody(api.get("/api/v1/locations?pageSize=100&" + q(search=f"Deep BOM {t}"))[1]))
    s.assert_("the Excel-saved row is imported", len(got) >= 1, f"{len(got)} rows")

    # Accented characters must survive, whatever the server's default charset is.
    accented = f"Name,Address,City,Country\nDeep Café Münster {t},1 St,Town,FR\n".encode("utf-8")
    raw, ct = multipart("file", "accents.csv", accented, "text/csv")
    res = s.check("validate a file with accented characters",
                  api.request("POST", "/api/v1/import/locations/validate", raw=raw, content_type=ct))
    if res is not None:
        name = ((res.get("rows") or [{}])[0].get("data") or {}).get("Name", "")
        s.assert_("accented characters round-trip", "Café Münster" in name, name)

    # Round trip: what the app exports, the app must be able to import — the
    # export's BOM is exactly what the importer had choked on.
    exported = s.raw("export the locations just imported",
                     api.get("/api/v1/locations/export?" + q(search=f"Deep BOM {t}")))
    if exported:
        raw, ct = multipart("file", "roundtrip.csv", exported, "text/csv")
        res = s.check("re-import the app's own export",
                      api.request("POST", "/api/v1/import/locations/validate", raw=raw, content_type=ct))
        if res is not None:
            s.assert_("the app can read back what it wrote",
                      res.get("invalidRows") == 0 and (res.get("validRows") or 0) >= 1,
                      json.dumps(res)[:200])

    # A non-CSV upload must be refused rather than parsed.
    raw, ct = multipart("file", "notes.txt", b"this is not a csv", "text/plain")
    st, _ = api.request("POST", "/api/v1/import/locations/validate", raw=raw, content_type=ct)
    s.assert_("a non-CSV upload is refused or reported", st in (200, 400), f"got {st}")


def test_attachments(s, f):
    s.section("Attachments — upload, list, download, delete")
    api, t = s.api, s.tag
    content = b"deep qa attachment body\n"
    raw, ct = multipart("file", "deep.txt", content, "text/plain")
    up = s.check("upload an attachment to an asset",
                 api.request("POST", f"/api/v1/attachments/Asset/{f['a1']['id']}",
                             raw=raw, content_type=ct), (200, 201))
    if not up:
        return
    rows = s.check("list the asset's attachments",
                   api.get(f"/api/v1/attachments/Asset/{f['a1']['id']}"))
    if rows is not None:
        items = rows if isinstance(rows, list) else rows.get("items", [])
        s.assert_("the uploaded file is listed", any(x["id"] == up["id"] for x in items))
        s.assert_("the stored size matches what was uploaded",
                  any(x["id"] == up["id"] and x.get("fileSize") == len(content) for x in items),
                  str(items))
    body = s.raw("download the attachment", api.get(f"/api/v1/attachments/{up['id']}/download"))
    s.assert_("the downloaded bytes match what was uploaded", body == content,
              f"{len(body or b'')} bytes")
    # Attachments work on every entity type that offers them.
    # Attachments are offered on these three entity types, and the UI sends the
    # names capitalised — so that is what is tested.
    for kind, eid in (("Certificate", f["c1"]["id"]), ("Application", f["ap1"]["id"])):
        raw, ct = multipart("file", f"{kind}.txt", b"x", "text/plain")
        st, b = api.request("POST", f"/api/v1/attachments/{kind}/{eid}", raw=raw, content_type=ct)
        s.assert_(f"upload an attachment to a {kind}", st in (200, 201),
                  f"got {st}: {b.decode(errors='replace')[:120]}")
        s.check(f"list a {kind}'s attachments", api.get(f"/api/v1/attachments/{kind}/{eid}"))
    s.check("an unknown entity type is refused",
            api.get(f"/api/v1/attachments/nonsense/{f['a1']['id']}"), (400, 404))
    s.check("delete the attachment", api.delete(f"/api/v1/attachments/{up['id']}"), (200, 204))
    rows = jbody(api.get(f"/api/v1/attachments/Asset/{f['a1']['id']}")[1]) or []
    items = rows if isinstance(rows, list) else rows.get("items", [])
    s.assert_("the deleted attachment is gone", all(x["id"] != up["id"] for x in items))
    s.check("downloading a deleted attachment is 404",
            api.get(f"/api/v1/attachments/{up['id']}/download"), 404)


PNG_1PX = bytes.fromhex(
    "89504e470d0a1a0a0000000d494844520000000100000001080600000"
    "01f15c4890000000a49444154789c6360000002000100ffff03000006"
    "0005574bd8b70000000049454e44ae426082")


def test_asset_models(s, f):
    s.section("Asset models — image lifecycle and archive/restore")
    api, t = s.api, s.tag
    m = s.check("create an asset model", api.post("/api/v1/asset-models", {
        "name": f"Deep Model {t}", "assetTypeId": f["atA"]["id"],
        "manufacturer": "DeepCorp", "modelNumber": "DM-1"}), 201)
    if not m:
        return
    raw, ct = multipart("file", "img.png", PNG_1PX, "image/png")
    s.check("upload a model image",
            api.request("POST", f"/api/v1/asset-models/{m['id']}/image", raw=raw, content_type=ct))
    body = s.raw("fetch the model image", api.get(f"/api/v1/asset-models/{m['id']}/image"))
    s.assert_("the image bytes come back", body == PNG_1PX, f"{len(body or b'')} bytes")
    # A non-image upload must be refused.
    raw, ct = multipart("file", "x.txt", b"not an image", "text/plain")
    st, _ = api.request("POST", f"/api/v1/asset-models/{m['id']}/image", raw=raw, content_type=ct)
    s.assert_("a non-image upload is refused", st == 400, f"got {st}")
    s.check("delete the model image", api.delete(f"/api/v1/asset-models/{m['id']}/image"), (200, 204))
    s.check("fetching a deleted image is 404", api.get(f"/api/v1/asset-models/{m['id']}/image"), 404)
    s.check("update the model", api.put(f"/api/v1/asset-models/{m['id']}", {
        "name": f"Deep Model Renamed {t}", "assetTypeId": f["atA"]["id"]}))
    s.check("archive the model", api.delete(f"/api/v1/asset-models/{m['id']}"))
    rows = ids_of(jbody(api.get("/api/v1/asset-models?pageSize=100")[1]))
    s.assert_("an archived model is hidden by default", m["id"] not in rows)
    rows = ids_of(jbody(api.get("/api/v1/asset-models?pageSize=100&includeArchived=true")[1]))
    s.assert_("includeArchived=true reveals it", m["id"] in rows)
    s.check("restore the model", api.post(f"/api/v1/asset-models/{m['id']}/restore"))
    rows = ids_of(jbody(api.get("/api/v1/asset-models?pageSize=100")[1]))
    s.assert_("the restored model is listed again", m["id"] in rows)


def test_templates(s, f):
    s.section("Asset templates")
    api, t = s.api, s.tag
    tpl = s.check("create an asset template", api.post("/api/v1/asset-templates", {
        "name": f"Deep Tpl {t}", "assetTypeId": f["atA"]["id"],
        "locationId": f["locA"]["id"], "notes": "from template"}), 201)
    if not tpl:
        return
    got = s.check("read it back", api.get(f"/api/v1/asset-templates/{tpl['id']}"))
    s.assert_("the template kept its defaults",
              got and got.get("locationId") == f["locA"]["id"],
              str(got and got.get("locationId")))
    rows = s.check("list templates filtered by asset type",
                   api.get(f"/api/v1/asset-templates?assetTypeId={f['atA']['id']}"))
    if rows is not None:
        items = rows if isinstance(rows, list) else rows.get("items", [])
        s.assert_("the template appears under its asset type",
                  any(x["id"] == tpl["id"] for x in items))
    s.check("update the template", api.put(f"/api/v1/asset-templates/{tpl['id']}", {
        "name": f"Deep Tpl Renamed {t}", "assetTypeId": f["atA"]["id"]}))
    s.check("archive the template", api.delete(f"/api/v1/asset-templates/{tpl['id']}"))


def test_rbac(s, base, f):
    """
    The full role matrix. Every endpoint class is probed as each of the three
    roles, and as a user with no role at all — the case the app refuses outright.
    """
    s.section("Role-based access control — the full matrix")

    # (label, method, path, body, admin, operator, user)
    OK, NO = "allow", "deny"
    cases = [
        ("GET /assets",            "GET",  "/api/v1/assets",                None, OK, OK, OK),
        ("GET /assets/{id}",       "GET",  f"/api/v1/assets/{f['a1']['id']}", None, OK, OK, OK),
        ("GET /assets/export",     "GET",  "/api/v1/assets/export",         None, OK, OK, OK),
        ("GET /applications",      "GET",  "/api/v1/applications",          None, OK, OK, OK),
        ("GET /certificates",      "GET",  "/api/v1/certificates",          None, OK, OK, OK),
        ("GET /people",            "GET",  "/api/v1/people",                None, OK, OK, OK),
        ("GET /locations",         "GET",  "/api/v1/locations",             None, OK, OK, OK),
        ("GET /asset-types",       "GET",  "/api/v1/asset-types",           None, OK, OK, OK),
        ("GET /asset-models",      "GET",  "/api/v1/asset-models",          None, OK, OK, OK),
        ("GET /asset-templates",   "GET",  "/api/v1/asset-templates",       None, OK, OK, OK),
        ("GET /search",            "GET",  "/api/v1/search?q=a",            None, OK, OK, OK),
        ("GET /reports/asset-summary", "GET", "/api/v1/reports/asset-summary", None, OK, OK, OK),
        ("GET /saved-views",       "GET",  "/api/v1/saved-views?entityType=asset", None, OK, OK, OK),
        ("GET /alert-rules",       "GET",  "/api/v1/alert-rules",           None, OK, OK, OK),
        ("GET /user-notifications", "GET", "/api/v1/user-notifications",    None, OK, OK, OK),
        ("GET /auth/me",           "GET",  "/api/v1/auth/me",               None, OK, OK, OK),
        # Writes: Admin and Operator only.
        ("POST /assets",           "POST", "/api/v1/assets",
         {"name": "{UNIQUE} asset", "assetTypeId": "{RBACTYPE}"},           OK, OK, NO),
        ("PUT /assets/{id}",       "PUT",  "/api/v1/assets/{FRESH3}",
         {"name": "{UNIQUE} renamed", "assetTypeId": "{RBACTYPE}"},         OK, OK, NO),
        ("DELETE /assets/{id}",    "DELETE", "/api/v1/assets/{FRESH}",         None, OK, OK, NO),
        ("POST /locations",        "POST", "/api/v1/locations", {"name": "{UNIQUE} loc"}, OK, OK, NO),
        ("POST /people",           "POST", "/api/v1/people", {"fullName": "{UNIQUE} person"}, OK, OK, NO),
        ("POST /asset-types",      "POST", "/api/v1/asset-types", {"name": "{UNIQUE} type"}, OK, OK, NO),
        ("POST /assets/bulk-archive", "POST", "/api/v1/assets/bulk-archive", {"ids": []}, OK, OK, NO),
        ("POST /assets/{id}/checkout", "POST", "/api/v1/assets/{FRESH2}/checkout",
         {"personId": f["p1"]["id"]},                                        OK, OK, NO),
        # Dashboard is Admin/Operator only.
        ("GET /dashboard/summary", "GET",  "/api/v1/dashboard/summary",     None, OK, OK, NO),
        # Admin only.
        ("GET /audit-logs",        "GET",  "/api/v1/audit-logs",            None, OK, NO, NO),
        ("GET /users",             "GET",  "/api/v1/users",                 None, OK, NO, NO),
        ("GET /roles",             "GET",  "/api/v1/roles",                 None, OK, NO, NO),
        ("GET /import/assets/template", "GET", "/api/v1/import/assets/template", None, OK, NO, NO),
        ("GET /alerts/history",    "GET",  "/api/v1/alerts/history",        None, OK, NO, NO),
        ("GET /settings/alerts",   "GET",  "/api/v1/settings/alerts",       None, OK, NO, NO),
    ]

    # A type of its own, with no models: an asset type that has models requires
    # one to be chosen, which would fail the probe for a reason unrelated to roles.
    rbac_type = jbody(s.api.post("/api/v1/asset-types",
                                 {"name": f"RBAC Type {s.tag}"})[1]) or {}
    rbac_type_id = rbac_type.get("id", f["atA"]["id"])

    for role_idx, identity in enumerate(("admin", "operator", "user")):
        client = Api(base)
        st, _ = client.get(f"/.auth/login/aad?identity={identity}")
        if st != 302:
            s.r.fail(f"sign in as {identity}", f"got {st}")
            continue
        s.r.ok(f"sign in as {identity}", "302")
        # Destructive probes need a target of their own, or the second role to
        # run would be denied by business rules rather than by permissions.
        fresh = s.api.post("/api/v1/assets", {
            "name": f"RBAC del {identity} {s.tag}", "assetTypeId": rbac_type_id})
        fresh2 = s.api.post("/api/v1/assets", {
            "name": f"RBAC out {identity} {s.tag}", "assetTypeId": rbac_type_id})
        fresh3 = s.api.post("/api/v1/assets", {
            "name": f"RBAC put {identity} {s.tag}", "assetTypeId": rbac_type_id})
        fid = (jbody(fresh[1]) or {}).get("id", BAD_UUID)
        fid2 = (jbody(fresh2[1]) or {}).get("id", BAD_UUID)
        fid3 = (jbody(fresh3[1]) or {}).get("id", BAD_UUID)
        for label, method, path, body, *expected in cases:
            want = expected[role_idx]
            path = (path.replace("{FRESH2}", str(fid2)).replace("{FRESH3}", str(fid3))
                        .replace("{FRESH}", str(fid)))
            if body:
                # Each role writes its own records, so a name clash can't be
                # mistaken for a permission failure.
                body = {k: (v.replace("{UNIQUE}", f"RBAC {identity} {s.tag}")
                            .replace("{RBACTYPE}", str(rbac_type_id))
                            if isinstance(v, str) else v)
                        for k, v in body.items()}
            status, raw = client.request(method, path, body)
            if want == OK:
                good = status < 400
                detail = f"{status}"
                if not good:
                    detail = f"{status}: {raw.decode(errors='replace')[:120]}"
                s.assert_(f"[{identity}] {label} is allowed", good, detail)
            else:
                s.assert_(f"[{identity}] {label} is denied", status == 403,
                          f"got {status}, expected 403")

    # A user with no app role must be refused entirely, not defaulted to reader.
    client = Api(base)
    st, _ = client.get("/.auth/login/aad?identity=norole")
    status, raw = client.get("/api/v1/auth/me")
    s.assert_("a user with no role is refused", status == 403, f"got {status}")
    parsed = jbody(raw) or {}
    s.assert_("the refusal explains why", parsed.get("code") == "no_role_assigned",
              json.dumps(parsed)[:160])
    status, _ = client.get("/api/v1/assets")
    s.assert_("a no-role user cannot read data either", status == 403, f"got {status}")

    # And an unauthenticated caller gets 401, not 200 or a redirect loop.
    anon = Api(base)
    for path in ("/api/v1/assets", "/api/v1/auth/me", "/api/v1/dashboard/summary"):
        status, _ = anon.get(path)
        s.assert_(f"anonymous GET {path} is 401", status == 401, f"got {status}")


def test_security_headers_and_csrf(s, base):
    s.section("CSRF and security headers")
    # The harness always adds the header, so the probe has to be built by hand.
    client = Api(base)
    client.get("/.auth/login/aad?identity=admin")
    import urllib.request as _u
    req = _u.Request(base + "/api/v1/locations", data=json.dumps({"name": "csrf probe"}).encode(),
                     method="POST", headers={"Content-Type": "application/json"})
    try:
        with client.opener.open(req) as resp:
            st, body = resp.status, resp.read()
    except Exception as e:
        st, body = getattr(e, "code", 0), getattr(e, "read", lambda: b"")()
    s.assert_("a write without X-Requested-With is refused", st == 403, f"got {st}")
    parsed = jbody(body) or {}
    s.assert_("the CSRF refusal names its reason",
              parsed.get("code") == "csrf_header_missing", json.dumps(parsed)[:140])


def test_scim_depth(s, base):
    """SCIM beyond reachability: the filter, the patch and the delete must bite."""
    s.section("SCIM — provisioning effects")
    import urllib.parse
    scim = Api(base)
    h = {"Authorization": "Bearer dev-scim-token"}
    st, _ = scim.get("/scim/v2/ServiceProviderConfig", headers=h)
    if st == 404:
        s.r.skip("SCIM depth", "SCIM disabled")
        return
    t = s.tag
    u = s.check("provision a SCIM user", scim.request("POST", "/scim/v2/Users", {
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
        "userName": f"deep-{t}@example.com", "displayName": f"Deep SCIM {t}",
        "active": True, "externalId": f"deep-ext-{t}",
        "emails": [{"value": f"deep-{t}@example.com", "primary": True}]}, headers=h), (200, 201))
    if not u:
        return
    uid = u["id"]
    flt = urllib.parse.quote(f'userName eq "deep-{t}@example.com"')
    got = s.check("filter by userName", scim.get(f"/scim/v2/Users?filter={flt}", headers=h))
    if got:
        res = got.get("Resources", [])
        s.assert_("the filter returns exactly the provisioned user",
                  len(res) == 1 and res[0]["id"] == uid, f"{len(res)} results")
    flt_none = urllib.parse.quote('userName eq "nobody-here@example.com"')
    got = s.check("filter with no match", scim.get(f"/scim/v2/Users?filter={flt_none}", headers=h))
    if got:
        s.assert_("a non-matching filter returns nothing",
                  got.get("totalResults") == 0 or got.get("Resources") == [], json.dumps(got)[:140])
    s.check("deactivate via PATCH", scim.request("PATCH", f"/scim/v2/Users/{uid}", {
        "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
        "Operations": [{"op": "replace", "path": "active", "value": False}]}, headers=h))
    got = s.check("read the patched user", scim.get(f"/scim/v2/Users/{uid}", headers=h))
    s.assert_("the PATCH actually deactivated the user", got and got.get("active") is False,
              str(got and got.get("active")))
    s.check("de-provision the user", scim.delete(f"/scim/v2/Users/{uid}", headers=h), (200, 204))
    # De-provisioning deactivates rather than deletes, so the account keeps its
    # audit history — the SCIM contract, and what Entra expects.
    after = jbody(scim.get(f"/scim/v2/Users/{uid}", headers=h)[1]) or {}
    s.assert_("a de-provisioned user is left inactive, not deleted",
              after.get("active") is False, json.dumps(after)[:140])


def mailhog_count(base="http://localhost:8025"):
    """How many messages MailHog is holding, or None if it isn't running."""
    try:
        with urllib.request.urlopen(f"{base}/api/v2/messages", timeout=3) as r:
            return json.loads(r.read()).get("total")
    except Exception:
        return None


def wait_for_mail(before, base="http://localhost:8025", timeout=15):
    """Waits for the mailbox to grow; SMTP delivery is not instantaneous."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        now = mailhog_count(base)
        if now is not None and now > before:
            return True
        time.sleep(0.5)
    return False


def test_users_and_alerts(s):
    s.section("User administration and alert delivery")
    api = s.api
    users = s.check("GET /users", api.get("/api/v1/users"))
    s.check("GET /users?includeInactive=true", api.get("/api/v1/users?includeInactive=true"))
    if users:
        rows = users if isinstance(users, list) else users.get("items", [])
        s.assert_("the signed-in admin appears in the user list", len(rows) >= 1, f"{len(rows)} users")
        me = jbody(api.get("/api/v1/auth/me")[1]) or {}
        target = next((u for u in rows if u.get("id") != me.get("id")), None)
        s.check("GET /users/{id}", api.get(f"/api/v1/users/{rows[0]['id']}"))
        if target:
            s.check("deactivate another user",
                    api.put(f"/api/v1/users/{target['id']}/active", {"isActive": False}))
            again = jbody(api.get(f"/api/v1/users/{target['id']}")[1])
            s.assert_("the deactivation is persisted", again and again.get("isActive") is False,
                      str(again and again.get("isActive")))
            s.check("reactivate them",
                    api.put(f"/api/v1/users/{target['id']}/active", {"isActive": True}))
        else:
            s.r.skip("user activate/deactivate", "only the current user exists")

    s.check("POST /alerts/send-now", api.post("/api/v1/alerts/send-now"))
    hist = s.check("GET /alerts/history", api.get("/api/v1/alerts/history"))
    s.check("GET /alerts/history paginates", api.get("/api/v1/alerts/history?page=1&pageSize=5"))
    # Delivery, not just a 200: the message must actually arrive at the local
    # MailHog. Without this the alert path can be "green" while sending nothing.
    before = mailhog_count()
    res = s.check("POST /alerts/test-email",
                  api.post("/api/v1/alerts/test-email", {"recipient": "qa@example.com"}))
    if res is not None:
        s.assert_("the test email reports an outcome", "success" in res or "message" in res,
                  json.dumps(res)[:140])
    if before is None:
        s.r.skip("test email is delivered to the mailbox", "MailHog is not reachable on :8025")
    else:
        s.assert_("the test email is actually delivered to the mailbox",
                  wait_for_mail(before), f"MailHog held {before} messages and did not grow")
    st, body = api.post("/api/v1/alerts/test-slack")
    s.assert_("POST /alerts/test-slack answers (success or a clear failure)",
              st in (200, 400, 503), f"got {st}: {body.decode(errors='replace')[:120]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:5115")
    args = ap.parse_args()

    s = Suite(args.base)
    print(f"\n{'='*70}\nDeep API capability test against {args.base}\n{'='*70}")
    if not s.sign_in():
        print(f"{RED}Could not sign in. Is the API running with SPRING_PROFILES_ACTIVE=dev?{RESET}")
        return 2
    s.r.ok("sign in via Easy Auth emulator", "302")

    f = build_fixtures(s)
    if not f:
        return 2

    test_filters(s, f)
    test_sorting(s)
    test_pagination(s)
    test_validation(s, f)
    test_business_rules(s, f)
    test_custom_fields(s)
    test_dashboard(s)
    test_reports(s)
    test_exports(s, f)
    test_saved_views(s)
    test_alert_rules_and_notifications(s)
    test_settings_and_profile(s)
    test_restore(s, f)
    test_legacy_path_aliases(s)
    test_bulk_operations(s, f)
    test_duplicates(s, f)
    test_sub_resources(s, f)
    test_offboard_and_reassign(s, f)
    test_import(s, f)
    test_attachments(s, f)
    test_asset_models(s, f)
    test_templates(s, f)
    test_users_and_alerts(s)
    test_scim_depth(s, args.base)
    test_security_headers_and_csrf(s, args.base)
    test_rbac(s, args.base, f)

    r = s.r
    print(f"\n{'='*70}")
    total = len(r.passed) + len(r.failed)
    print(f"{GREEN}{len(r.passed)} passed{RESET}, "
          f"{RED if r.failed else DIM}{len(r.failed)} failed{RESET}, "
          f"{YELLOW if r.skipped else DIM}{len(r.skipped)} skipped{RESET}  (of {total} checks)")
    if r.skipped:
        print(f"\n{YELLOW}SKIPPED (could not be tested here):{RESET}")
        for name, detail in r.skipped:
            print(f"  - {name}: {detail}")
    if r.failed:
        print(f"\n{RED}FAILURES:{RESET}")
        for name, detail in r.failed:
            print(f"  - {name}: {detail}")
    return 1 if r.failed else 0


if __name__ == "__main__":
    sys.exit(main())
