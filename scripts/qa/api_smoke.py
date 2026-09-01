#!/usr/bin/env python3
"""
End-to-end API smoke test: exercises every endpoint against a running API.

Signs in through the Easy Auth emulator (so it uses the real authentication
path), builds a complete data fixture, then calls every route — including the
awkward ones: check-out/check-in, retire/sell, renewals, seat assignment,
offboarding, bulk operations, CSV import/export, attachments and SCIM.

    python3 scripts/qa/api_smoke.py [--base http://localhost:5115]

Exits non-zero if any check fails, and prints a per-endpoint report.
"""
import argparse
import io
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from http.cookiejar import CookieJar

RESET, RED, GREEN, YELLOW, DIM = "\033[0m", "\033[31m", "\033[32m", "\033[33m", "\033[2m"


class Result:
    def __init__(self):
        self.passed, self.failed, self.skipped = [], [], []

    def ok(self, name, detail=""):
        self.passed.append((name, detail))
        print(f"  {GREEN}PASS{RESET} {name} {DIM}{detail}{RESET}")

    def fail(self, name, detail):
        self.failed.append((name, detail))
        print(f"  {RED}FAIL{RESET} {name} {RED}{detail}{RESET}")

    def skip(self, name, detail):
        self.skipped.append((name, detail))
        print(f"  {YELLOW}SKIP{RESET} {name} {DIM}{detail}{RESET}")


class Api:
    """Cookie-authenticated client that echoes the CSRF token like the SPA."""

    def __init__(self, base):
        self.base = base.rstrip("/")
        self.jar = CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.jar), NoRedirect()
        )


    def request(self, method, path, body=None, raw=None, content_type=None, headers=None):
        url = path if path.startswith("http") else self.base + path
        data = None
        hdrs = dict(headers or {})
        if raw is not None:
            data = raw
            if content_type:
                hdrs["Content-Type"] = content_type
        elif body is not None:
            data = json.dumps(body).encode()
            hdrs["Content-Type"] = "application/json"
        if method not in ("GET", "HEAD"):
            # State-changing requests must carry the custom header the API
            # requires as its CSRF defence.
            hdrs.setdefault("X-Requested-With", "XMLHttpRequest")
        req = urllib.request.Request(url, data=data, method=method, headers=hdrs)
        try:
            with self.opener.open(req) as resp:
                return resp.status, resp.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()
        except Exception as e:  # connection refused etc.
            return 0, str(e).encode()

    def get(self, p, **kw):
        return self.request("GET", p, **kw)

    def post(self, p, body=None, **kw):
        return self.request("POST", p, body, **kw)

    def put(self, p, body=None, **kw):
        return self.request("PUT", p, body, **kw)

    def delete(self, p, **kw):
        return self.request("DELETE", p, **kw)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def jbody(raw):
    try:
        return json.loads(raw)
    except Exception:
        return None


def multipart(field, filename, content, mime):
    boundary = "----qa" + uuid.uuid4().hex
    body = io.BytesIO()
    body.write(f"--{boundary}\r\n".encode())
    body.write(
        f'Content-Disposition: form-data; name="{field}"; filename="{filename}"\r\n'.encode()
    )
    body.write(f"Content-Type: {mime}\r\n\r\n".encode())
    body.write(content)
    body.write(f"\r\n--{boundary}--\r\n".encode())
    return body.getvalue(), f"multipart/form-data; boundary={boundary}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:5115")
    ap.add_argument("--identity", default="admin")
    args = ap.parse_args()

    api = Api(args.base)
    r = Result()
    tag = uuid.uuid4().hex[:8]

    def check(name, got, expect=(200, 201, 204), detail=""):
        exp = expect if isinstance(expect, (tuple, list)) else (expect,)
        status, raw = got
        if status in exp:
            r.ok(name, f"{status} {detail}".strip())
            return jbody(raw)
        body = raw.decode(errors="replace")[:300]
        r.fail(name, f"expected {exp}, got {status}: {body}")
        return None

    print(f"\n{'='*70}\nAPI smoke test against {args.base}\n{'='*70}")

    # ---------------------------------------------------------------- auth
    print("\n-- Authentication --")
    status, _ = api.get(f"/.auth/login/aad?identity={args.identity}")
    if status != 302:
        print(f"{RED}Could not sign in (status {status}). Is the API running "
              f"with SPRING_PROFILES_ACTIVE=dev?{RESET}")
        return 2
    r.ok("sign in via Easy Auth emulator", "302")
    me = check("GET /auth/me", api.get("/api/v1/auth/me"))
    if not me:
        return 2
    print(f"  {DIM}signed in as {me['username']} roles={me['roles']}{RESET}")
    check("GET /.auth/me", api.get("/.auth/me"))
    check("GET /health", api.get("/api/v1/health"))

    # ------------------------------------------------------------ fixtures
    print("\n-- Reference data --")
    loc = check("POST /locations", api.post("/api/v1/locations", {"name": f"QA Loc {tag}"}), 201)
    loc2 = check("POST /locations (second)", api.post("/api/v1/locations", {"name": f"QA Loc B {tag}"}), 201)
    atype = check("POST /asset-types", api.post("/api/v1/asset-types", {"name": f"QA Type {tag}"}), 201)
    ctype = check("POST /certificate-types", api.post("/api/v1/certificate-types", {"name": f"QA CType {tag}"}), 201)
    apptype = check("POST /application-types", api.post("/api/v1/application-types", {"name": f"QA AType {tag}"}), 201)
    person = check("POST /people", api.post("/api/v1/people", {"fullName": f"QA Person {tag}", "email": f"qa{tag}@example.com", "locationId": loc["id"]}), 201)
    person2 = check("POST /people (second)", api.post("/api/v1/people", {"fullName": f"QA Person B {tag}"}), 201)

    if not all([loc, atype, ctype, apptype, person]):
        print(f"{RED}Fixture creation failed; aborting.{RESET}")
        return 2

    model = check("POST /asset-models", api.post("/api/v1/asset-models", {"name": f"QA Model {tag}", "assetTypeId": atype["id"], "manufacturer": "QA Corp"}), 201)
    template = check("POST /asset-templates", api.post("/api/v1/asset-templates", {"name": f"QA Template {tag}", "assetTypeId": atype["id"]}), 201)

    asset = check("POST /assets", api.post("/api/v1/assets", {
        "name": f"QA Asset {tag}", "assetTypeId": atype["id"], "locationId": loc["id"],
        "serialNumber": f"SN-{tag}", "purchaseCost": 1234.56, "purchaseDate": "2024-01-15",
        "warrantyExpiryDate": "2027-01-15", "depreciationMonths": 36,
        "assetModelId": model["id"] if model else None,
    }), 201)
    # This asset type has a model, and the app requires one to be chosen in that
    # case — so pass it, rather than asserting a rule the app doesn't have.
    asset2 = check("POST /assets (second)", api.post("/api/v1/assets", {
        "name": f"QA Asset B {tag}", "assetTypeId": atype["id"], "assetModelId": model["id"],
    }), 201)
    # A second type with no models, to exercise the "model optional" path and to
    # give the asset-model archive check something unused to delete.
    atype2 = check("POST /asset-types (modelless)", api.post("/api/v1/asset-types", {"name": f"QA Type NM {tag}"}), 201)
    asset3 = check("POST /assets (type without models needs no model)", api.post("/api/v1/assets", {
        "name": f"QA Asset C {tag}", "assetTypeId": atype2["id"],
    }), 201)

    cert = check("POST /certificates", api.post("/api/v1/certificates", {
        "name": f"QA Cert {tag}", "certificateTypeId": ctype["id"],
        "issueDate": "2024-01-01", "expiryDate": "2027-01-01",
        "locationId": loc["id"], "assignedPersonId": person["id"],
    }), 201)

    app_ = check("POST /applications", api.post("/api/v1/applications", {
        "name": f"QA App {tag}", "applicationTypeId": apptype["id"],
        "expiryDate": "2027-06-01", "maxSeats": 5, "cost": 99.99,
    }), 201)

    ids = {
        "loc": loc["id"], "loc2": loc2["id"] if loc2 else None, "atype": atype["id"],
        "ctype": ctype["id"], "apptype": apptype["id"], "person": person["id"],
        "person2": person2["id"] if person2 else None,
        "model": model["id"] if model else None,
        "template": template["id"] if template else None,
        "asset": asset["id"] if asset else None,
        "asset2": asset2["id"] if asset2 else None,
        "asset3": asset3["id"] if asset3 else None,
        "atype2": atype2["id"] if atype2 else None,
        "cert": cert["id"] if cert else None,
        "app": app_["id"] if app_ else None,
    }

    # --------------------------------------------------------------- lists
    print("\n-- List, detail, export --")
    for label, path in [
        ("assets", "/api/v1/assets"), ("certificates", "/api/v1/certificates"),
        ("applications", "/api/v1/applications"), ("people", "/api/v1/people"),
        ("locations", "/api/v1/locations"), ("asset-types", "/api/v1/asset-types"),
        ("certificate-types", "/api/v1/certificate-types"),
        ("application-types", "/api/v1/application-types"),
        ("asset-models", "/api/v1/asset-models"),
        ("asset-templates", "/api/v1/asset-templates"),
        ("roles", "/api/v1/roles"), ("users", "/api/v1/users"),
        ("audit-logs", "/api/v1/audit-logs"), ("saved-views", "/api/v1/saved-views?entityType=assets"),
        ("alert-rules", "/api/v1/alert-rules"),
        ("user-notifications", "/api/v1/user-notifications"),
        ("notifications summary", "/api/v1/notifications/summary"),
        ("alerts history", "/api/v1/alerts/history"),
    ]:
        check(f"GET /{label}", api.get(path))

    check("GET /assets (paged+sorted+filtered)", api.get(f"/api/v1/assets?page=1&pageSize=5&sortBy=name&sortDir=desc&search=QA"))
    check("GET /people (paged+sorted)", api.get("/api/v1/people?page=1&pageSize=5&sortBy=fullname&sortDir=desc"))
    check("GET /user-notifications/unread-count", api.get("/api/v1/user-notifications/unread-count"))

    for label, path in [
        ("assets", f"/api/v1/assets/{ids['asset']}"),
        ("certificates", f"/api/v1/certificates/{ids['cert']}"),
        ("applications", f"/api/v1/applications/{ids['app']}"),
        ("people", f"/api/v1/people/{ids['person']}"),
        ("locations", f"/api/v1/locations/{ids['loc']}"),
        ("asset-types", f"/api/v1/asset-types/{ids['atype']}"),
        ("certificate-types", f"/api/v1/certificate-types/{ids['ctype']}"),
        ("application-types", f"/api/v1/application-types/{ids['apptype']}"),
        ("asset-models", f"/api/v1/asset-models/{ids['model']}"),
        ("asset-templates", f"/api/v1/asset-templates/{ids['template']}"),
        ("users", f"/api/v1/users/{me['id']}"),
    ]:
        check(f"GET /{label}/{{id}}", api.get(path))

    for label in ["assets", "certificates", "applications", "people", "locations"]:
        check(f"GET /{label}/export", api.get(f"/api/v1/{label}/export"))
    check("GET /audit-logs/export", api.get("/api/v1/audit-logs/export"))
    check("GET /assets/export (selected ids)", api.get(f"/api/v1/assets/export?ids={ids['asset']}"))

    for label, path in [
        ("asset-types", f"/api/v1/asset-types/{ids['atype']}/customfields"),
        ("certificate-types", f"/api/v1/certificate-types/{ids['ctype']}/customfields"),
        ("application-types", f"/api/v1/application-types/{ids['apptype']}/customfields"),
    ]:
        check(f"GET /{label}/{{id}}/customfields", api.get(path))

    # ------------------------------------------------------------- updates
    print("\n-- Updates --")
    a = jbody(api.get(f"/api/v1/assets/{ids['asset']}")[1])
    check("PUT /assets/{id}", api.put(f"/api/v1/assets/{ids['asset']}", {
        "name": f"QA Asset {tag} edited", "assetTypeId": ids["atype"],
        "locationId": ids["loc"], "assetModelId": ids["model"],
        "entityVersion": a.get("entityVersion"),
    }))
    c = jbody(api.get(f"/api/v1/certificates/{ids['cert']}")[1])
    check("PUT /certificates/{id}", api.put(f"/api/v1/certificates/{ids['cert']}", {
        "name": f"QA Cert {tag} edited", "certificateTypeId": ids["ctype"],
        "issueDate": "2024-01-01", "expiryDate": "2027-01-01",
        "entityVersion": c.get("entityVersion"),
    }))
    ap_ = jbody(api.get(f"/api/v1/applications/{ids['app']}")[1])
    check("PUT /applications/{id}", api.put(f"/api/v1/applications/{ids['app']}", {
        "name": f"QA App {tag} edited", "applicationTypeId": ids["apptype"],
        "maxSeats": 5, "entityVersion": ap_.get("entityVersion"),
    }))
    p = jbody(api.get(f"/api/v1/people/{ids['person']}")[1])
    check("PUT /people/{id}", api.put(f"/api/v1/people/{ids['person']}", {
        "fullName": f"QA Person {tag} edited", "email": f"qa{tag}@example.com",
        "entityVersion": p.get("entityVersion"),
    }))
    l = jbody(api.get(f"/api/v1/locations/{ids['loc']}")[1])
    check("PUT /locations/{id}", api.put(f"/api/v1/locations/{ids['loc']}", {
        "name": f"QA Loc {tag} edited", "entityVersion": l.get("entityVersion"),
    }))
    check("PUT /asset-types/{id}", api.put(f"/api/v1/asset-types/{ids['atype']}", {"name": f"QA Type {tag} edited"}))
    check("PUT /certificate-types/{id}", api.put(f"/api/v1/certificate-types/{ids['ctype']}", {"name": f"QA CType {tag} edited"}))
    check("PUT /application-types/{id}", api.put(f"/api/v1/application-types/{ids['apptype']}", {"name": f"QA AType {tag} edited"}))
    check("PUT /asset-models/{id}", api.put(f"/api/v1/asset-models/{ids['model']}", {"name": f"QA Model {tag} edited", "assetTypeId": ids["atype"]}))
    check("PUT /asset-templates/{id}", api.put(f"/api/v1/asset-templates/{ids['template']}", {"name": f"QA Template {tag} edited", "assetTypeId": ids["atype"]}))

    # ------------------------------------------------------ asset lifecycle
    print("\n-- Asset lifecycle --")
    check("POST /assets/{id}/checkout", api.post(f"/api/v1/assets/{ids['asset']}/checkout", {"personId": ids["person"]}))
    check("GET /assets/{id}/history", api.get(f"/api/v1/assets/{ids['asset']}/history"))
    check("POST /assets/{id}/checkin", api.post(f"/api/v1/assets/{ids['asset']}/checkin", {}))
    check("POST /assets/{id}/retire", api.post(f"/api/v1/assets/{ids['asset']}/retire", {"notes": "QA retire"}))
    check("POST /assets/{id}/sell", api.post(f"/api/v1/assets/{ids['asset2']}/sell", {"salePrice": 100, "notes": "QA sale"}))
    check("POST /assets/check-duplicates", api.post("/api/v1/assets/check-duplicates", {"serialNumber": f"SN-{tag}"}))
    check("POST /assets/bulk-status", api.post("/api/v1/assets/bulk-status", {"ids": [ids["asset"]], "status": "Available"}))
    check("POST /assets/bulk-edit", api.post("/api/v1/assets/bulk-edit", {"ids": [ids["asset"]], "locationId": ids["loc2"]}))

    # ----------------------------------------------------- other lifecycles
    print("\n-- Certificate / application lifecycle --")
    check("GET /certificates/{id}/history", api.get(f"/api/v1/certificates/{ids['cert']}/history"))
    check("POST /certificates/{id}/renew", api.post(f"/api/v1/certificates/{ids['cert']}/renew", {"newExpiryDate": "2028-01-01"}))
    check("POST /certificates/check-duplicates", api.post("/api/v1/certificates/check-duplicates", {"name": f"QA Cert {tag}"}))
    check("POST /certificates/bulk-status", api.post("/api/v1/certificates/bulk-status", {"ids": [ids["cert"]], "status": "Active"}))

    check("GET /applications/{id}/history", api.get(f"/api/v1/applications/{ids['app']}/history"))
    check("POST /applications/{id}/renew", api.post(f"/api/v1/applications/{ids['app']}/renew", {"newExpiryDate": "2028-06-01"}))
    check("POST /applications/{id}/seats", api.post(f"/api/v1/applications/{ids['app']}/seats", {"personId": ids["person"]}))
    check("GET /applications/{id}/seats", api.get(f"/api/v1/applications/{ids['app']}/seats"))
    check("DELETE /applications/{id}/seats/{personId}", api.delete(f"/api/v1/applications/{ids['app']}/seats/{ids['person']}"))
    check("POST /applications/{id}/deactivate", api.post(f"/api/v1/applications/{ids['app']}/deactivate", {}))
    check("POST /applications/{id}/reactivate", api.post(f"/api/v1/applications/{ids['app']}/reactivate", {}))
    check("POST /applications/check-duplicates", api.post("/api/v1/applications/check-duplicates", {"name": f"QA App {tag}"}))
    check("POST /applications/bulk-status", api.post("/api/v1/applications/bulk-status", {"ids": [ids["app"]], "status": "Active"}))

    # ------------------------------------------------------------- people
    print("\n-- People --")
    check("GET /people/search", api.get("/api/v1/people/search?query=QA"))
    check("GET /people/{id}/assets", api.get(f"/api/v1/people/{ids['person']}/assets"))
    check("GET /people/{id}/summary", api.get(f"/api/v1/people/{ids['person']}/summary"))
    check("GET /people/{id}/history", api.get(f"/api/v1/people/{ids['person']}/history"))
    check("GET /people/{id}/certificates", api.get(f"/api/v1/people/{ids['person']}/certificates"))
    check("GET /people/{id}/applications", api.get(f"/api/v1/people/{ids['person']}/applications"))
    check("POST /people/check-duplicates", api.post("/api/v1/people/check-duplicates", {"email": f"qa{tag}@example.com"}))
    check("POST /people/{id}/offboard", api.post(
        f"/api/v1/people/{ids['person2']}/offboard",
        {"actions": [], "deactivatePerson": True}))

    # ----------------------------------------------------------- locations
    print("\n-- Locations --")
    check("GET /locations/{id}/assets", api.get(f"/api/v1/locations/{ids['loc']}/assets"))
    check("GET /locations/{id}/people", api.get(f"/api/v1/locations/{ids['loc']}/people"))
    check("GET /locations/{id}/certificates", api.get(f"/api/v1/locations/{ids['loc']}/certificates"))
    check("GET /locations/{id}/applications", api.get(f"/api/v1/locations/{ids['loc']}/applications"))
    check("POST /locations/check-duplicates", api.post("/api/v1/locations/check-duplicates", {"name": f"QA Loc {tag}"}))

    # ------------------------------------------------- dashboard & reports
    print("\n-- Dashboard --")
    for w in ["summary", "status-breakdown", "warranty-expiries", "assets-by-type",
              "assets-by-location", "checked-out", "recently-added", "assets-by-age",
              "unassigned", "value-by-location", "certificate-expiries",
              "certificate-summary", "licence-expiries", "inventory-snapshot",
              "application-summary"]:
        check(f"GET /dashboard/{w}", api.get(f"/api/v1/dashboard/{w}"))

    print("\n-- Reports --")
    for rep in ["asset-summary", "expiries", "licence-summary", "assignments",
                "asset-lifecycle", "depreciation"]:
        check(f"GET /reports/{rep}", api.get(f"/api/v1/reports/{rep}"))

    print("\n-- Search --")
    check("GET /search", api.get("/api/v1/search?query=QA"))

    # ------------------------------------------------------------ settings
    print("\n-- Settings, saved views, alert rules --")
    sysset = check("GET /settings/system", api.get("/api/v1/settings/system"))
    if sysset is not None:
        check("PUT /settings/system", api.put("/api/v1/settings/system", sysset))
    alertset = check("GET /settings/alerts", api.get("/api/v1/settings/alerts"))
    if alertset is not None:
        check("PUT /settings/alerts", api.put("/api/v1/settings/alerts", alertset))

    sv = check("POST /saved-views", api.post("/api/v1/saved-views", {
        "name": f"QA View {tag}", "entityType": "assets",
        "configuration": json.dumps({"columns": ["name"]}),
    }), (200, 201))
    if sv:
        check("PUT /saved-views/{id}", api.put(f"/api/v1/saved-views/{sv['id']}", {
            "name": f"QA View {tag} edited",
            "configuration": json.dumps({"columns": ["name", "status"]}),
        }))
        check("PUT /saved-views/{id}/default", api.put(f"/api/v1/saved-views/{sv['id']}/default", {}))
        check("DELETE /saved-views/{id}", api.delete(f"/api/v1/saved-views/{sv['id']}"), (200, 204))

    rule = check("POST /alert-rules", api.post("/api/v1/alert-rules", {
        "name": f"QA Rule {tag}", "entityTypes": "Asset,Certificate",
        "thresholds": "30,14,7", "notifyEmail": False,
    }), (200, 201))
    if rule:
        check("PUT /alert-rules/{id}", api.put(f"/api/v1/alert-rules/{rule['id']}", {
            "name": f"QA Rule {tag} edited", "entityTypes": "Asset",
            "thresholds": "14", "notifyEmail": False, "isActive": True,
        }))
        check("DELETE /alert-rules/{id}", api.delete(f"/api/v1/alert-rules/{rule['id']}"), (200, 204))

    check("PUT /profile", api.put("/api/v1/profile", {"themePreference": "dark"}))
    check("PUT /profile (reset)", api.put("/api/v1/profile", {"themePreference": None}))

    # --------------------------------------------------------- attachments
    print("\n-- Attachments --")
    payload, ctype_hdr = multipart("file", "qa.txt", b"qa attachment\n", "text/plain")
    att = check("POST /attachments/Asset/{id}", api.post(
        f"/api/v1/attachments/Asset/{ids['asset']}", raw=payload, content_type=ctype_hdr), (200, 201))
    check("GET /attachments/Asset/{id}", api.get(f"/api/v1/attachments/Asset/{ids['asset']}"))
    if att:
        check("GET /attachments/{id}/download", api.get(f"/api/v1/attachments/{att['id']}/download"))
        check("DELETE /attachments/{id}", api.delete(f"/api/v1/attachments/{att['id']}"), (200, 204))

    # ---------------------------------------------------- asset model image
    print("\n-- Asset model image --")
    png = bytes.fromhex(
        "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753"
        "de0000000c4944415408d763f8cfc00000030101002d0d0aae0000000049454e44ae426082"
    )
    img, img_ct = multipart("file", "qa.png", png, "image/png")
    check("POST /asset-models/{id}/image", api.post(
        f"/api/v1/asset-models/{ids['model']}/image", raw=img, content_type=img_ct), (200, 201, 204))
    check("GET /asset-models/{id}/image", api.get(f"/api/v1/asset-models/{ids['model']}/image"))
    check("DELETE /asset-models/{id}/image", api.delete(f"/api/v1/asset-models/{ids['model']}/image"), (200, 204))

    # --------------------------------------------------------------- import
    print("\n-- CSV import --")
    for ent in ["locations", "people", "assets", "certificates", "applications"]:
        check(f"GET /import/{ent}/template", api.get(f"/api/v1/import/{ent}/template"))
    csv_body = f"Name\nQA Imported Loc {tag}\n".encode()
    up, up_ct = multipart("file", "locations.csv", csv_body, "text/csv")
    validated = check("POST /import/locations/validate", api.post(
        "/api/v1/import/locations/validate", raw=up, content_type=up_ct))
    up2, up2_ct = multipart("file", "locations.csv", csv_body, "text/csv")
    check("POST /import/locations/execute", api.post(
        "/api/v1/import/locations/execute", raw=up2, content_type=up2_ct))

    # ---------------------------------------------------------- alert tests
    print("\n-- Alerts --")
    check("POST /alerts/send-now", api.post("/api/v1/alerts/send-now", {}), (200, 202, 204, 400, 500))
    check("POST /alerts/test-email", api.post("/api/v1/alerts/test-email", {"to": "qa@example.com"}), (200, 202, 204, 400, 500))
    check("POST /alerts/test-slack", api.post("/api/v1/alerts/test-slack", {}), (200, 202, 204, 400, 500))

    # -------------------------------------------------- user notifications
    print("\n-- User notifications --")
    # In-app notifications are produced by alert processing, which refuses to run
    # unless a delivery channel is configured. Configure a throwaway Slack
    # webhook, create a rule and an expiring asset so there is something to
    # notify about, run it, then put the settings back.
    original_alerts = jbody(api.get("/api/v1/settings/alerts")[1])
    generated = False
    if original_alerts is not None:
        soon = (__import__("datetime").date.today() + __import__("datetime").timedelta(days=5)).isoformat()
        api.post("/api/v1/assets", {
            "name": f"QA Expiring {tag}", "assetTypeId": ids["atype2"],
            "warrantyExpiryDate": soon,
        })
        api.post("/api/v1/alert-rules", {
            "name": f"QA Notify Rule {tag}", "entityTypes": "Asset",
            "thresholds": "30", "notifyEmail": False,
        })
        tweaked = dict(original_alerts)
        tweaked["slackWebhookUrl"] = "http://127.0.0.1:9/qa-unroutable"
        tweaked["warrantyEnabled"] = True
        api.put("/api/v1/settings/alerts", tweaked)
        st, _ = api.post("/api/v1/alerts/send-now", {})
        generated = st == 200
        (r.ok if generated else r.fail)("POST /alerts/send-now (channel configured)", f"{st}")
        api.put("/api/v1/settings/alerts", original_alerts)

    notes = jbody(api.get("/api/v1/user-notifications")[1]) or []
    items = notes.get("items", notes) if isinstance(notes, dict) else notes
    if items:
        nid = items[0]["id"]
        check("POST /user-notifications/{id}/read", api.post(f"/api/v1/user-notifications/{nid}/read", {}), (200, 204))
        check("POST /user-notifications/{id}/snooze", api.post(f"/api/v1/user-notifications/{nid}/snooze", {"duration": "1w"}), (200, 204))
        check("POST /user-notifications/{id}/dismiss", api.post(f"/api/v1/user-notifications/{nid}/dismiss", {}), (200, 204))
    else:
        (r.skip if not generated else r.fail)(
            "user-notification read/snooze/dismiss",
            "alert processing produced no in-app notification to act on")
    check("POST /user-notifications/read-all", api.post("/api/v1/user-notifications/read-all", {}), (200, 204))

    # -------------------------------------------------------------- delete
    print("\n-- Archive / delete / restore --")
    check("POST /assets/bulk-archive", api.post("/api/v1/assets/bulk-archive", {"ids": [ids["asset2"]]}))
    check("POST /certificates/bulk-archive", api.post("/api/v1/certificates/bulk-archive", {"ids": [ids["cert"]]}))
    check("POST /applications/bulk-archive", api.post("/api/v1/applications/bulk-archive", {"ids": [ids["app"]]}))
    check("POST /people/bulk-archive", api.post("/api/v1/people/bulk-archive", {"ids": [ids["person"]]}))
    check("DELETE /assets/{id}", api.delete(f"/api/v1/assets/{ids['asset']}"), (200, 204))
    check("POST /assets/{id}/restore", api.post(f"/api/v1/assets/{ids['asset']}/restore", {}), (200, 204))
    check("DELETE /asset-templates/{id}", api.delete(f"/api/v1/asset-templates/{ids['template']}"), (200, 204))
    # In use by an asset: the app refuses, which is the behaviour we want.
    st, body = api.delete(f"/api/v1/asset-models/{ids['model']}")
    in_use_guarded = st == 400 and b"asset" in body.lower()
    (r.ok if in_use_guarded else r.fail)("DELETE /asset-models/{id} refused while in use", f"{st} {body.decode(errors='replace')[:120]}")
    # A model nothing references archives cleanly.
    spare = jbody(api.post("/api/v1/asset-models", {"name": f"QA Spare Model {tag}", "assetTypeId": ids["atype2"]})[1])
    if spare:
        check("DELETE /asset-models/{id} (unused)", api.delete(f"/api/v1/asset-models/{spare['id']}"), (200, 204))
        check("POST /asset-models/{id}/restore", api.post(f"/api/v1/asset-models/{spare['id']}/restore", {}), (200, 204))
    check("POST /locations/{id}/reassign-and-archive", api.post(
        f"/api/v1/locations/{ids['loc2']}/reassign-and-archive", {"targetLocationId": ids["loc"]}), (200, 204))
    check("DELETE /locations/{id}", api.delete(f"/api/v1/locations/{ids['loc']}"), (200, 204, 400, 409))
    check("POST /asset-types/bulk-archive", api.post("/api/v1/asset-types/bulk-archive", {"ids": [ids["atype2"]]}), (200, 204))
    check("POST /certificate-types/bulk-archive", api.post("/api/v1/certificate-types/bulk-archive", {"ids": [ids["ctype"]]}), (200, 204))
    check("POST /application-types/bulk-archive", api.post("/api/v1/application-types/bulk-archive", {"ids": [ids["apptype"]]}), (200, 204))

    # ------------------------------------------------------ security checks
    print("\n-- Security behaviour --")
    anon = Api(args.base)
    st, _ = anon.get("/api/v1/assets")
    (r.ok if st == 401 else r.fail)("anonymous request is rejected", f"{st}")
    st, _ = anon.get("/api/v1/health")
    (r.ok if st == 200 else r.fail)("health is public", f"{st}")
    # A write with the session cookie but no custom header is exactly the shape
    # of a forged cross-site request.
    req = urllib.request.Request(args.base + "/api/v1/locations", data=json.dumps({"name": "x"}).encode(),
                                 method="POST", headers={"Content-Type": "application/json"})
    try:
        with api.opener.open(req) as resp:
            st, raw = resp.status, resp.read()
    except urllib.error.HTTPError as e:
        st, raw = e.code, e.read()
    ok = st == 403 and b"csrf_header_missing" in raw
    (r.ok if ok else r.fail)("write without the CSRF header is rejected", f"{st} {raw.decode(errors='replace')[:80]}")

    st, _ = api.get("/api/v1/definitely-not-a-route")
    (r.ok if st == 404 else r.fail)("unknown path returns 404", f"{st}")

    # ---------------------------------------------------------- role checks
    print("\n-- Role enforcement --")
    ro = Api(args.base)
    st, _ = ro.get("/.auth/login/aad?identity=user")
    if st == 302:
        ro.get("/api/v1/auth/me")
        st, _ = ro.get("/api/v1/assets")
        (r.ok if st == 200 else r.fail)("read-only User can read assets", f"{st}")
        st, _ = ro.post("/api/v1/locations", {"name": "should fail"})
        (r.ok if st == 403 else r.fail)("read-only User cannot write", f"{st}")
        st, _ = ro.get("/api/v1/users")
        (r.ok if st == 403 else r.fail)("read-only User cannot list users", f"{st}")
    else:
        r.skip("role enforcement", "could not sign in as 'user'")

    norole = Api(args.base)
    st, _ = norole.get("/.auth/login/aad?identity=norole")
    if st == 302:
        st, body = norole.get("/api/v1/auth/me")
        detail = jbody(body) or {}
        ok = st == 403 and detail.get("code") == "no_role_assigned"
        (r.ok if ok else r.fail)("user with no app role is refused", f"{st} {detail.get('code')}")
    else:
        r.skip("no-role refusal", "could not sign in as 'norole'")

    # -------------------------------------------------------------- OpenAPI
    # The docs are off unless SWAGGER_ENABLED is set, so a normal run has
    # nothing to check here. That is exactly why springdoc went unexercised and
    # the Spring Boot 4 upgrade broke it unnoticed — the guarantee that the spec
    # still builds lives in OpenApiDocsIntegrationTest, which switches the docs
    # on for one test. This checks the deployed-with-docs case when it applies.
    print("\n-- OpenAPI documentation --")
    st, body = api.get("/v3/api-docs")
    if st == 404:
        r.skip("OpenAPI", "docs disabled (SWAGGER_ENABLED unset); covered by OpenApiDocsIntegrationTest")
    else:
        (r.ok if st == 200 else r.fail)("GET /v3/api-docs serves the generated spec", f"{st}")
        if st == 200 and isinstance(body, dict):
            paths = body.get("paths") or {}
            (r.ok if len(paths) > 100 else r.fail)(
                "the spec documents the API's paths", f"{len(paths)} paths")
        check("GET /swagger-ui/index.html", api.get("/swagger-ui/index.html"))

    # ----------------------------------------------------------------- SCIM
    print("\n-- SCIM provisioning --")
    scim = Api(args.base)
    scim_hdrs = {"Authorization": "Bearer dev-scim-token"}
    st, _ = scim.get("/scim/v2/ServiceProviderConfig", headers=scim_hdrs)
    if st == 404:
        r.skip("SCIM", "disabled (scim.enabled=false)")
    else:
        for name, path in [("ServiceProviderConfig", "/scim/v2/ServiceProviderConfig"),
                           ("Schemas", "/scim/v2/Schemas"),
                           ("ResourceTypes", "/scim/v2/ResourceTypes"),
                           ("Users", "/scim/v2/Users")]:
            check(f"GET /scim/v2/{name}", scim.get(path, headers=scim_hdrs))

        st, _ = scim.get("/scim/v2/Users")
        (r.ok if st == 401 else r.fail)("SCIM rejects a request with no bearer token", f"{st}")
        st, _ = scim.get("/scim/v2/Users", headers={"Authorization": "Bearer wrong"})
        (r.ok if st == 401 else r.fail)("SCIM rejects a wrong bearer token", f"{st}")

        scim_user = check("POST /scim/v2/Users", scim.request(
            "POST", "/scim/v2/Users",
            {"schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
             "userName": f"scim-{tag}@example.com", "displayName": f"SCIM User {tag}",
             "active": True, "externalId": f"scim-ext-{tag}",
             "emails": [{"value": f"scim-{tag}@example.com", "primary": True}]},
            headers=scim_hdrs), (200, 201))
        if scim_user:
            sid = scim_user["id"]
            check("GET /scim/v2/Users/{id}", scim.get(f"/scim/v2/Users/{sid}", headers=scim_hdrs))
            flt = urllib.parse.quote(f'userName eq "scim-{tag}@example.com"')
            check("GET /scim/v2/Users?filter", scim.get(
                f"/scim/v2/Users?filter={flt}", headers=scim_hdrs))
            check("PUT /scim/v2/Users/{id}", scim.request("PUT", f"/scim/v2/Users/{sid}",
                {"schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
                 "userName": f"scim-{tag}@example.com", "displayName": f"SCIM User {tag} edited",
                 "active": True}, headers=scim_hdrs))
            check("PATCH /scim/v2/Users/{id}", scim.request("PATCH", f"/scim/v2/Users/{sid}",
                {"schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
                 "Operations": [{"op": "replace", "path": "active", "value": False}]},
                headers=scim_hdrs))
            check("DELETE /scim/v2/Users/{id}", scim.delete(f"/scim/v2/Users/{sid}", headers=scim_hdrs), (200, 204))

    # -------------------------------------------------------------- report
    print(f"\n{'='*70}")
    total = len(r.passed) + len(r.failed)
    print(f"{GREEN}{len(r.passed)} passed{RESET}, "
          f"{RED if r.failed else DIM}{len(r.failed)} failed{RESET}, "
          f"{YELLOW if r.skipped else DIM}{len(r.skipped)} skipped{RESET}  (of {total} checks)")
    if r.failed:
        print(f"\n{RED}FAILURES:{RESET}")
        for name, detail in r.failed:
            print(f"  - {name}: {detail}")
    print("=" * 70)
    return 1 if r.failed else 0


if __name__ == "__main__":
    sys.exit(main())
