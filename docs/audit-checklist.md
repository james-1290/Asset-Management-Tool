# Audit checklist

Every sweep works this list, top to bottom. It exists because the sweeps before
it improvised their own scope: each one picked whatever lenses seemed relevant,
found real defects, and reported convergence — where "converged" only ever meant
"nothing left that I happened to think of". Each sweep then found things the
previous one should have caught, which is a fault in the method, not in the
effort.

A sweep is complete when every row below has a verdict, not when nothing new
turns up. **A row that has never been checked is not a pass** — record it as a
gap and say so.

Verdicts: **OK** (checked, nothing found) · **Fixed** (defect found and
resolved) · **N/A** (does not apply, with the reason) · **Gap** (not verifiable
here — say what would be needed).

## Two axes, not one

This list is the **concerns** axis: the kinds of problem to look for. On its own
it is not coverage, because a row can be satisfied by checking one endpoint out
of two hundred and still read as done — which is exactly what happened when
"path traversal: OK" meant "checked on attachments".

The **subjects** axis is every endpoint, screen, control and file the concern
has to be applied to. It is measured, not asserted:

| Axis | Measured by | Enforced |
|---|---|---|
| Every API endpoint reached by a suite | `scripts/qa/endpoint_coverage.py`, against what the running API records it served | Yes — the sweep fails if any route is never reached |
| Every GUI control named by a spec | `e2e/qa/inventory.spec.ts` → `scripts/qa/gui_coverage.py` | Reported by the sweep |
| Every line of code exercised | JaCoCo (tests **and** the running API) and Vitest | Reported by the sweep, not gated |

Both run in `scripts/qa/full_sweep.sh`. A concern marked OK without a subject
count behind it is an opinion.

---

## 1. Access control (OWASP A01)

| # | Check | Verdict |
|---|---|---|
| 1.1 | Every endpoint has an authorization rule; none rely on being unlinked | OK — all 178 probed as Admin/Operator/User/no-role/anonymous |
| 1.2 | Object-level authorization: one user cannot read or change another's records | OK — saved views, alert rules, notifications all scoped by owner |
| 1.3 | Consistent not-found vs forbidden, so existence cannot be probed | Fixed — alert rules returned 403 where saved views returned 404 |
| 1.4 | Role escalation: a lower role cannot reach a higher role's function | OK — full role matrix in `api_deep.py` |
| 1.5 | Path traversal in any user-controlled path segment or filename | OK — entity type allow-listed, id is a UUID, filename strips separators and `..` |
| 1.6 | CORS origins are explicit, not reflected or wildcarded with credentials | OK — explicit list, `allowCredentials = false` |
| 1.7 | Forced browsing: UI-hidden actions are still refused by the API | OK — read-only role gating proved at both layers |

## 2. Cryptography and secrets (A02)

| # | Check | Verdict |
|---|---|---|
| 2.1 | No secrets committed; `.env` ignored; history clean | OK |
| 2.2 | The app refuses to start on default credentials | OK — `SecurityStartupValidator` |
| 2.3 | Secret comparison is constant-time where a token is checked | OK — SCIM bearer uses `MessageDigest.isEqual` |
| 2.4 | Sensitive values never placed in URLs or query strings | OK — no token/secret query parameters |
| 2.5 | TLS/HSTS configured for production | OK — HSTS with preload-length max-age |

## 3. Injection (A03)

| # | Check | Verdict |
|---|---|---|
| 3.1 | SQL injection — all queries parameterised | OK — JPA Criteria and named parameters throughout |
| 3.2 | LIKE-wildcard injection in search terms | OK — `SqlUtils.escapeLikePattern` |
| 3.3 | XSS — no `dangerouslySetInnerHTML`, no `eval` | OK |
| 3.4 | CSV formula injection in exports | Fixed — guard existed; it also mangled negative numbers |
| 3.5 | Log injection — user input cannot forge log lines | OK — SLF4J placeholders throughout; the one caller-supplied header (`X-Request-Id`) is charset-validated |
| 3.6 | Header injection via user-controlled response headers | OK — export filenames are literals; attachment names URL-encoded |
| 3.7 | Command injection — no shell invocation with user input | OK — no process execution anywhere |

## 4. Insecure design (A04)

| # | Check | Verdict |
|---|---|---|
| 4.1 | Rate limiting, and it cannot be bypassed by a spoofed header | OK — `X-Forwarded-For` trusted only behind a proxy, off by default |
| 4.2 | Mass assignment — request DTOs cannot set internal fields | OK — explicit DTOs |
| 4.3 | Business-rule abuse: seat limits, lifecycle order, safe deletes | OK — invariants asserted in `api_deep.py` |
| 4.4 | Resource exhaustion: page size caps, row caps, upload size | Fixed — sub-lists were unbounded |

## 5. Misconfiguration (A05)

| # | Check | Verdict |
|---|---|---|
| 5.1 | Security header suite incl. CSP, frame-ancestors, nosniff | OK |
| 5.2 | Actuator/management endpoints restricted | OK — health only |
| 5.3 | Errors do not leak stack traces or internals | OK — correlation id only |
| 5.4 | Caching headers correct for authenticated responses | Fixed — image response was shared-cacheable |
| 5.5 | API docs not exposed unauthenticated | OK — behind auth |

## 6. Vulnerable components (A06)

| # | Check | Verdict |
|---|---|---|
| 6.1 | Frontend dependency advisories, blocking in CI | OK |
| 6.2 | Backend dependency advisories | Fixed — nothing watched them; Dependabot added |
| 6.3 | CI actions pinned so a moved tag cannot change the build | Fixed — were tags, now commit SHAs |
| 6.4 | Dependency licences compatible with distribution | OK — all permissive (MIT/ISC/Apache/BSD/MPL); no GPL, AGPL or SSPL |
| 6.5 | After a major framework upgrade, behaviour changes that still compile | Fixed — Boot 4 silently dropped Flyway auto-config, moved Jackson to `tools.jackson`, and Hibernate 7 stopped tolerating lazy reads outside a session (22 endpoints 500ing). None was a compile error. Run the deep API suite against the built jar, not just `./gradlew test`. |
| 6.6 | Features disabled by default are still exercised somewhere | Fixed — the OpenAPI spec is off unless `SWAGGER_ENABLED` is set, so no suite ever built it and Boot 4 broke it unnoticed; a test now enables it. Anything behind a default-off flag has the same blind spot. |
| 6.7 | QA results are trustworthy — no environmental failures read as defects | Fixed — a sleeping machine made the browser suite fail differently on every run (`ERR_NETWORK_IO_SUSPENDED`, 30s timeouts); the sweep now runs under `caffeinate`. |
| 6.8 | Every check the docs claim to run actually runs | **GAP** — `npm run deadcode` is listed in docs/qa.md as one of the suites, but `knip` is in no dependency list (so the script fails on a clean checkout) and neither the sweep nor CI invokes it. The dead-code check has not been running at all. Not fixed here: unrelated to the framework upgrade. |
| 6.9 | Dependency upgrades that fail silently rather than loudly | OK — icon-library majors can export a name that draws nothing; `e2e/qa/icons.spec.ts` asserts every rendered icon has geometry (664 across 14 screens). |
| 6.10 | Lint suppressions are justified and tracked, not silent | **GAP** — ESLint 10's `react-hooks/set-state-in-effect` found four real cascading-render sites. One is fixed (`use-mobile`); three set state in response to asynchronously loaded data and carry a justified disable, because unwinding them is a refactor rather than upgrade work. They should be revisited. |

## 7. Authentication and session (A07)

| # | Check | Verdict |
|---|---|---|
| 7.1 | A user with no role is refused rather than defaulted | OK |
| 7.2 | Deactivated accounts refused even with a valid session | OK — integration test |
| 7.3 | Session cookie flags: HttpOnly, Secure, SameSite | OK — the only app-set cookie is the dev emulator's (HttpOnly, SameSite=Lax; no Secure because local dev is HTTP, and it refuses to run outside dev profiles). In production the cookie is App Service's |
| 7.4 | Session expiry and idle timeout | N/A to the app — it is stateless and authenticates per request from Easy Auth headers. Lifetime is the platform's. **Gap**: not verifiable without a tenant |
| 7.5 | Sign-out invalidates the session server-side | N/A — no app-side session to invalidate; `/.auth/logout` is the platform's. Revocation is in fact immediate: a deactivated user is refused on the next request |
| 7.6 | CSRF defence cannot go stale | OK — required custom header |

## 8. Data integrity and supply chain (A08)

| # | Check | Verdict |
|---|---|---|
| 8.1 | No unsafe deserialization of user input | OK — no Java serialization, XMLDecoder or unsafe YAML |
| 8.2 | Optimistic locking on concurrently edited records | Fixed — five entities lacked it |
| 8.3 | Migrations forward-only and never edited after apply | OK |
| 8.4 | Uploads validated by content, not just declared type | OK — content-sniffed, extension and MIME allow-lists |
| 8.5 | Decompression/parser bombs on upload | OK — uploads are stored as bytes, never decoded or decompressed server-side; CSV is row-capped |

## 9. Logging and monitoring (A09)

| # | Check | Verdict |
|---|---|---|
| 9.1 | Every write is audited | Fixed — alert sends were not |
| 9.2 | Requests correlatable across log lines | Fixed — request id added |
| 9.3 | Personal data not written to logs | Fixed — an email address was logged on every personal alert. SCIM still logs a username once per provisioning event, kept deliberately for diagnosis and noted in operations.md |
| 9.4 | Health endpoint reports readiness, not just liveness | Fixed — container health check added |

## 10. SSRF (A10)

| # | Check | Verdict |
|---|---|---|
| 10.1 | Server-side requests to user-supplied URLs are constrained | Fixed — host allow-list and HTTPS were already enforced; redirects were not, which is the usual way an allow-list is defeated |
| 10.2 | Outbound requests cannot reach internal addresses or metadata endpoints | OK for Slack (allow-listed host, no redirects). SMTP host is admin-configurable by design — pointing at your own mail server is the feature; noted as accepted |

## 11. Correctness and data handling

| # | Check | Verdict |
|---|---|---|
| 11.1 | Client and server agree on what is required | Fixed — form demanded fields the importer never did |
| 11.2 | Character encoding end to end, including Excel's conventions | Fixed — both import and export were wrong |
| 11.3 | Timezone handling consistent | Fixed — alerts used the server's local zone |
| 11.4 | Money and rounding consistent | OK — one depreciation calculator, 2dp |
| 11.5 | Soft delete is reversible everywhere it is offered | Fixed — twice; the API, then the five lists with no control |
| 11.6 | Scheduled work is safe when the app runs on more than one instance | Fixed — every instance sent the alerts |

## 12. Performance

| # | Check | Verdict |
|---|---|---|
| 12.1 | No unbounded queries | Fixed |
| 12.2 | N+1 queries on list and detail paths | OK — fetch joins; sub-lists capped |
| 12.3 | Indexes cover the columns actually filtered and sorted | OK — composite `(is_archived, sort column)` indexes in V017. One exception by nature: sorting by *computed* status uses a CASE expression and cannot use an index, so it filesorts |
| 12.4 | Frontend bundle split so first paint is not the whole app | Fixed — 393 KB → 131 KB gzipped |
| 12.5 | Connection pool sized and bounded | OK — Hikari sized, with connection timeout and max-lifetime below MySQL's wait_timeout |

## 13. Accessibility

| # | Check | Verdict |
|---|---|---|
| 13.1 | Every control has an accessible name | OK — swept on all screens, enforced by a spec |
| 13.2 | One `h1` per page; heading order sensible | OK |
| 13.3 | Keyboard reachable and operable, visible focus | OK — `keyboard.spec.ts` |
| 13.4 | Colour contrast meets WCAG AA | Fixed — secondary text was 2.4:1 across every screen; dark-theme accent failed in both directions. `contrast.spec.ts` measures rendered pixels in both themes |
| 13.5 | Dialogs trap focus and restore it on close | OK — `keyboard.spec.ts` |

## 14. Code quality

| # | Check | Verdict |
|---|---|---|
| 14.1 | No unused files, exports or dependencies | Fixed — `npm run deadcode` now clean |
| 14.2 | No debug statements or commented-out code | OK |
| 14.3 | No TODO/FIXME debt | OK — none in 46k lines |
| 14.4 | Duplication extracted where it drives drift | Fixed — saved-view plumbing |
| 14.5 | Unused imports | Fixed |
| 14.6 | Consistent design across equivalent screens | Fixed — uniformity contract |
| 14.7 | Every endpoint reached by a suite | Fixed — measured, not assumed: 27 of 212 had never been reached (26 legacy aliases, 1 real). Now 212/212, enforced by the sweep |
| 14.8 | Every GUI control named by a spec | Fixed — 25 controls no spec had ever named (dashboard drill-downs, column sort headers, report tabs, three filters). Now 552/552 |
| 14.9 | Line and branch coverage measured | Fixed — **backend 82.7% lines, 52.7% branches** with the running API included (the test JVM alone reads 27%, which is why it had to be merged). **Frontend unit tests 11.9%**, scoped to pure logic on purpose — the screens are covered behaviourally by 14.8. Reported, never gated: a coverage target rewards tests written to raise a number. Branch coverage is the honest weak spot: error paths |

## 15. Operability and compliance

| # | Check | Verdict |
|---|---|---|
| 15.1 | Graceful shutdown | OK |
| 15.2 | Backup and restore documented | Fixed — `operations.md`, including that a database point-in-time restore does not bring attachments with it |
| 15.3 | Personal data: retention, and erasure as distinct from archive | N/A — **decided**: the product holds internal employee records only, so subject erasure is not a requirement. Archive remains the only removal. Revisit if it is ever used for contractors, customers or anyone outside the organisation |
| 15.4 | Configuration documented for the target environment | OK — `infra/azure` |
