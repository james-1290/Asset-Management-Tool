# Changelog

## 2026-09-01 — Nine dependency updates, batched

React 19.2.0 -> 19.2.8 and its types, Playwright 1.58.2 -> 1.62.1, Tailwind
4.1.18 -> 4.3.3, opencsv 5.9 -> 5.12.0, microsoft-graph 6.21.0 -> 6.67.0, and
the four GitHub Actions (checkout v7.0.1, setup-java v6.0.0, setup-node v7.0.0,
upload-artifact v7.0.1).

Two things the individual Dependabot PRs would have got wrong:

- **Tailwind would have been left mismatched.** #259 bumped `tailwindcss` to
  4.3.3 but not `@tailwindcss/vite`, which stays in lockstep with it and would
  have remained on 4.1.18.
- **The Actions bumps would have unpinned them.** Actions here are pinned to
  commit SHAs, not tags, so a moved tag cannot change the build. Dependabot's
  PRs move the SHA and the comment together, but each had to be resolved through
  the API and checked rather than taken on trust.

Not included: the tooling group (#254) carries TypeScript 5.9 -> 7.0, Vite
7 -> 8 and ESLint 9 -> 10 — three majors in the compiler and build chain, which
deserve their own pass rather than a batch.
## 2026-09-01 — lucide-react 1.x, and a check for icons that quietly stop drawing

lucide-react 0.563.0 -> 1.35.0, a major version. All 117 icons the app imports
across 85 files still exist, and the `LucideIcon` type survives, so the build,
lint and unit tests were green immediately.

That is exactly the problem. An icon library can rename or drop a glyph and
still export the old name — the component renders, occupies its space, and draws
nothing. TypeScript sees a valid import, lint sees valid code, and the browser
specs assert on labels and roles rather than on pixels, so a screen full of
blank gaps passes every gate we had.

`e2e/qa/icons.spec.ts` now walks fourteen screens and asserts that each rendered
icon actually contains geometry — 664 of them on this run, none blank. It also
asserts the count is non-trivial, so a selector that silently matches nothing
cannot pass it.
## 2026-09-01 — Testcontainers 2.0.5, and one less local workaround

Testcontainers 1.20.4 -> 2.0.5. The 2.x line renamed every module with a
`testcontainers-` prefix, so `org.testcontainers:junit-jupiter` and
`:mysql` become `:testcontainers-junit-jupiter` and `:testcontainers-mysql` —
a resolution failure, not a compile error, so it fails before anything builds.

The upside: **`DOCKER_API_VERSION=1.44` is no longer needed.** Docker Engine 29
rejected the API version docker-java negotiated on Testcontainers 1.x, and
without the pin every integration test died at startup with "Could not find a
valid Docker environment" — a failure that looked like broken code and was not,
and which the setup docs had to warn about. 2.x ships a docker-java that
negotiates correctly; the whole suite passes with the variable unset. The build
still honours it if set, for anyone on an older daemon, but the docs no longer
tell people it is required.

## 2026-08-31 — Kotlin 2.4.10 and Spring Boot 4.1.1, and the three breaking changes that hid behind a clean compile

Kotlin 1.9.23 -> 2.4.10 (K2 compiler), Spring Boot 3.3.7 -> 4.1.1 (Spring Framework 7, Hibernate 7, Jackson 3), Gradle 8.7 -> 8.14.3 (Boot 4 requires 8.14+).

The compiler found the easy half: Spring Data 4 tightened its generic bounds, so `JpaRepository`/`Specification` type parameters need `: Any`, and `CommandLineRunner.run` is no longer nullable. The interesting half compiled cleanly and failed at runtime.

**Flyway silently stopped running.** Boot 4 split auto-configuration out of the core jar, and `FlywayAutoConfiguration` now lives in `spring-boot-flyway`. Without that module Flyway sits on the classpath doing nothing: the app starts against an unmigrated database and Hibernate's `validate` fails on whichever table it checks first. Nothing warns you.

**Jackson 3 changed group and package.** Boot 4 ships Jackson 3 under `tools.jackson.*`; the Jackson 2 artifacts remain on the classpath transitively (via the Azure SDKs), so injecting `com.fasterxml.jackson.databind.ObjectMapper` still *compiles* and then fails at startup with no qualifying bean. `jackson-module-kotlin` had to move group too, or Kotlin data classes stop deserialising. Annotations stayed in `com.fasterxml.jackson.annotation` and needed no change. `Jackson2ObjectMapperBuilderCustomizer` becomes `JsonMapperBuilderCustomizer`, and `WRITE_DATES_AS_TIMESTAMPS` moved off `SerializationFeature` to `DateTimeFeature` — which Boot 4 exposes through no property at all, so `spring.jackson.serialization.write-dates-as-timestamps` is now a startup failure. It is set in `JacksonConfig` instead.

**Hibernate 7 stopped tolerating lazy reads outside a session.** Open-session-in-view has always been off here, and 23 read handlers mapped entities to DTOs without a transaction — walking a lazy `assetType`/`certificateType`/`person` proxy after the repository call had already closed its session. Hibernate 6 let this pass; Hibernate 7 throws `LazyInitializationException`, so those endpoints returned 500. All 23 now carry `@Transactional(readOnly = true)`.

Boot 4 also removed `TestRestTemplate` and moved `RestTemplateBuilder` into `spring-boot-restclient`. `AbstractIntegrationTest` is rebuilt on a plain `RestTemplate` configured the way `TestRestTemplate` configured itself — rooted at the random port, and never throwing on 4xx/5xx, since these tests assert on status codes. Every test helper kept its signature, so no test file changed.

**springdoc broke too, invisibly.** The OpenAPI spec is served only when `SWAGGER_ENABLED` is set, and it is not by default — so no suite had ever fetched it. Under Boot 4, springdoc 2.6.0 starts and registers its routes but throws while building the spec: a 500 that nobody would meet until someone turned the docs on in a deployed environment. 2.8.6 is the floor that works. `OpenApiDocsIntegrationTest` now switches the docs on for one test, so the spec is actually built on every run; it fails on 2.6.0 and passes on 2.8.6.

**How the runtime breakages were found, and what that says about the suites.** The backend suite caught one of the 23 lazy-loading failures. The deep API suite, running against the built jar, caught four more and then confirmed the rest of the class was fixed. The remaining 18 were found by fixing the *class* of defect rather than the instances the tests happened to reach — a reminder that green tests bound what is covered, not what is correct.

## 2026-08-31 — Stop improvising sweeps: an audit checklist, and the 8 defects its unchecked rows held

Every sweep so far picked its own lenses, found real defects, and called that convergence — where convergence only meant nothing was left that anyone had happened to think of. Each one then found things the one before should have caught. That is a fault in the method, not the effort.

`docs/audit-checklist.md` is now the list every sweep works, drawn from OWASP's categories plus correctness, performance, accessibility, quality and operability. A sweep is complete when every row has a verdict — and a row nobody has checked is recorded as a gap, never as a pass.

Writing it down exposed **24 rows that had never been checked**. Working them found eight defects:

**Accessibility** — contrast had never been measured. Secondary text was **2.4:1 where 4.5:1 is required**, on every screen: page descriptions, breadcrumbs, timestamps, placeholders, sidebar labels. White on the destructive red gave 3.76:1 on the notification badge. In dark mode the accent failed in *both* directions at once, being both a button background and accent text — fixed by inverting it there.

**Security** — the Slack webhook post followed redirects, which is the usual way a host allow-list is defeated. CI actions were pinned to tags, which can be moved to point at different code. A user's email address was logged on every personal alert.

**Verified clean** (14 rows, checked for the first time): path traversal, CORS, constant-time token comparison, secrets in URLs, log and header and command injection, deserialization, parser bombs, licences, index coverage, connection pool, keyboard operability and dialog focus trapping.

**Recorded as genuine gaps** (2): Easy Auth session lifetime, which needs a real tenant; and personal-data erasure, which is a product decision — archiving a person hides them but does not remove their data, and the audit log keeps their name. `docs/operations.md` sets out the options and their costs, alongside backup and restore, where the trap is that a database point-in-time restore does not bring attachments with it.

New specs pin the two accessibility areas: `keyboard.spec.ts` and `contrast.spec.ts`, the latter measuring rendered pixels in both themes.

## 2026-08-31 — Seventh sweep: code quality, dead code, bugs, security

A fresh pass with lenses the earlier sweeps had not applied. Ten findings, all fixed.

**Bugs**

- **A CSV saved by Excel failed on every row.** Excel's "CSV UTF-8" — the format an administrator is most likely to produce — starts with a byte-order mark. It is not whitespace, so `trim()` left it glued to the first header: "Name" arrived as "﻿Name" and every row failed with "Name is required" while the name sat there in plain sight.
- **Excel could not read our exports either.** They were written as UTF-8 with no mark, so "Café Münster" displayed as "CafÃ© MÃ¼nster" — the exact mirror of the import bug. Both directions now agree, and the deep suite round-trips: what the app exports, the app can import.
- **Negative numbers exported as text.** The formula-injection guard prefixed any leading `-`, which is right for `-1+1` and wrong for `-30`. The expiries report is mostly negative day counts, so a range starting in the past produced `"'-2009"` — a figure no spreadsheet would sum.
- **Every instance sent the same scheduled alerts.** The scheduler runs in-process, so on App Service scaled beyond one instance each fires the same run and every recipient gets duplicates. An instance now claims the run window with a single insert against a unique key.
- **Notification actions failed silently.** Mark-as-read, dismiss and snooze had no error handling, so a failure changed nothing on screen.
- **Restore had no control on five lists.** The endpoints and hooks existed; the three type registers, asset models and asset templates never got the UI — found by the dead-code scan flagging three restore hooks nobody called.

**Security**

- The model-image response was `max-age=3600` with no scope on an endpoint requiring a session, so a shared cache could hold one user's response and hand it to another. Now `private`, with an ETag.
- Nothing watched backend dependencies, while the frontend already failed on a high-severity advisory. Dependabot now covers Gradle, npm and the workflow's own actions.

**Code quality and dead code**

- The saved-view plumbing was copied across five list pages — about 550 lines differing only in entity type and filter keys. Now one `useSavedViewState` hook.
- Removed an unused type module, an unused hook, 13 unused imports, and wired in a Toaster wrapper that had been written to theme the toasts and never used. `npm run deadcode` now exits clean, so the next addition stands out.

Verified over clean-database cycles: 687 API capability checks, 197 smoke checks, 109 browser tests against both the dev server and the production build, backend, lint and build.

## 2026-08-31 — Fix all fourteen findings from the full review

Every finding from the product/engineering/QA/security review, fixed and verified. No security defects were found in that review; these are correctness, data-safety, performance, accessibility and operability items.

**Fix first**

- **Imported assets could not be edited.** The importer and API accept an asset with only a name and a type; the edit form demanded a serial number, location and purchase date as well, so every imported record was uneditable without inventing data. The form now requires what the API requires.
- **Archiving was one-way for eleven of thirteen record types.** Restore endpoints added for certificates, applications, people, locations, templates and all three type registers, each audited and each refusing a record that is not archived. Lists gained `includeArchived`, and the UI a shared "Archived" toggle plus a Restore row action that replaces Edit/Delete on an archived row.
- **The test suites did not run in the pipeline.** A CI job now stands up MySQL and MailHog, starts the API and web app, and runs both API suites and the browser suite on every pull request.

**Should fix**

- Seven sub-list endpoints returned every matching row; now capped at 200, with the UI saying so and linking to the full filtered list rather than truncating silently.
- The bundle shipped as one file; routes are now fetched on first visit and the big libraries split out. Entry chunk **393 KB → 131 KB gzipped**.
- Three controls had no accessible name (settings gear, notifications bell, audit-log detail button) and the dashboard had no heading. A new accessibility spec sweeps all sixteen screens.
- Alert sends are audited.
- The permission rules moved into `lib/permissions` as pure functions with tests, and the remaining form schemas gained tests. 57 → 69 frontend unit tests.

**Polish**

Another user's alert rule returns 404 rather than 403; alert dates use UTC like the rest of the app; version columns for the five entities that lacked optimistic locking (V019); a request id in the logging context, echoed on the response; a container HEALTHCHECK; and the error envelope documented in `docs/api.md`.

Two problems surfaced while fixing these, both fixed: moving a handler into a columns memo created a temporal dead zone that TypeScript and lint both passed and only the browser suite caught, and the extra toolbar control tipped the row over its width so the density toggle covered the export button.

## 2026-08-31 — Lift the table-density toggle into DataTable

The Comfortable/Compact control existed on the Applications list alone, hand-rolled from bare `<button>` elements against the house rule of building on shadcn primitives.

`DataTable` now owns it and renders `DensityToggle` itself, so every list gets the control without opting in — which is how the divergence arose in the first place. The choice is one app-wide setting (`useDensity`, persisted to `localStorage` and broadcast so tables mounted together stay in step), because someone who wants dense rows wants them everywhere. A page may still pass `tableDensity` to control it, in which case the table renders no control of its own. Compact now tightens the header row as well as the body.

`DensityToggle` is built to the same shape as `ViewModeToggle`, with real accessible names and `aria-pressed` rather than tooltip-only labels.

Screenshotting the result showed two further layout divergences, also fixed:

- **Assets kept its saved views, view-mode toggle and export in the page header**, while Applications and Certificates kept them in the toolbar. They have moved to the toolbar's right group, so all three major lists now read identically.
- **The Assets toolbar wrapped onto a second line**, being the only one using `flex-wrap`.

`docs/ux-guidelines.md` records the toolbar as a single row with a fixed order, and that the page header holds only the title, count and primary "Add …" button — never the view controls. `e2e/qa/uniformity.spec.ts` asserts the toggle on every list and that the choice carries between lists and across a reload.

## 2026-08-31 — Make the list pages keep one design, and hold them to it

An audit of all eleven list pages against each other found several with the plumbing for a feature but no control to reach it — the same class of defect as the missing Assets search box earlier today.

- **No column chooser on Assets or Applications.** Both build custom-field columns that default to hidden and both hold `columnVisibility` state, but neither rendered `ColumnToggle` — so a custom field could be defined on a type and then never shown as a column, on the two lists most likely to have them.
- **No saved-view selector on Assets**, although the page loads saved views and silently applies the user's default. Views could take effect but not be created, chosen or cleared.
- **No saved views at all on Applications**, alone among the major lists. Added.
- **No search box on Asset models**, though the endpoint has always accepted a `search` parameter.
- The audit log's placeholder read "Search..." rather than naming what it searches.
- The saved-view button's only accessible name was the *active view's* name ("Default" when there is none), naming the value rather than the control.

`e2e/qa/uniformity.spec.ts` now holds the contract as a table of every list and the capabilities its API actually has, asserting the controls across the whole set — so a single page that drifts fails the suite. `docs/ux-guidelines.md` records the contract, toolbar ordering, copy and accessibility rules, and the one divergence left open for a decision: Applications has a table-density toggle no other list offers.

## 2026-08-31 — Exhaustive feature sweep: capability testing, and the five defects it found

The previous sweeps proved every endpoint was *reachable* and every page *loaded*. This one tests every feature to its full capability — that filters filter, sorts sort, validation rejects, business rules hold, and every control the UI implies actually exists.

**New harnesses**

- `scripts/qa/api_deep.py` — 628 checks that assert behaviour rather than status codes: every filter parameter proved by inclusion *and* exclusion, every documented sort field checked for real ordering in both directions, validation and malformed input, lifecycle invariants (check-out/in, retire, sell, seat limits, safe deletes), all seven custom field types round-tripped, every dashboard widget and report in JSON and CSV, CSV import validated and executed, and the full role matrix across Admin/Operator/User/no-role/anonymous.
- `e2e/qa/deep-filters.spec.ts`, `deep-dialogs.spec.ts`, `deep-features.spec.ts` — 27 tests driving the search boxes, filter chips, advanced filter panel, view modes, column chooser, command search, and every dialog in the app, each verified against the record afterwards rather than against a toast.

**Defects found and fixed**

- **Sorting by Status did nothing sensible on certificates and applications.** Both display a *computed* status (a stored `Active` row reads as `Expired` or `PendingRenewal` once its expiry comes into range), but the sort ordered by the stored column — so an item shown as PendingRenewal sorted in among the Active ones, and ascending and descending returned the same sequence. The status *filter* was already computed-aware, which is what marks this as an oversight. Added `orderByComputedStatus`, applied to both controllers' list and export paths, with an integration test that fails without it.
- **The Assets list had no search box.** The page passed `search`/`onSearchChange` into a toolbar that never rendered an input, leaving the app's primary list the only one without search — and a saved view's search term applied invisibly, with no way to see or clear it.
- **The grouped view was unreachable on Assets and Applications.** Both render `GroupedGridView`, but only Certificates rendered the toggle, so it could only be reached by editing the URL by hand.
- **Three elements had no accessible name**: the reassign-location dialog (a visible heading but no `DialogTitle`, which Radix had been warning about on every open), the notifications action menu, and the dashboard expiring-items row link.

**Harness reliability**

- The e2e suite now runs with a single worker. Every spec shares one database and several change user-global state (alert settings, saved views, theme), so in parallel it failed a different three tests on each run — noise that buries real regressions.
- The CSRF write test asserted a new row was visible without filtering to it; it only passed while the database was small.

## 2026-08-30 — Complete the read-only permission fix (it was only a quarter done)

The previous change hid the **create** buttons from a read-only `User`, but a check with the browser showed the rest were still there: Edit/Delete row menus, the bulk action bar's Edit/Archive/status buttons, and every action on a record's own page — Check out, Retire, Sold, Clone, Edit, Upload. The API refused all of them, so a read-only user could still walk into a dialog, fill it in, and be told "Access denied".

- Row actions: each columns factory takes `canWrite` and drops the actions column entirely for a read-only viewer (`useMemo` dependencies updated accordingly, or the columns would not have been rebuilt when the role differed).
- `BulkActionBar` now separates write actions from `readOnlyActions`, so a read-only user keeps "Export Selected" and loses the rest.
- Detail pages (asset, certificate, application, person, location) gate their action rows, and the shared attachments section hides Upload and Delete while still allowing download.
- Asserted directly: as `user` — no row menus, no bulk write buttons, no detail actions; as `admin` — all still present.

## 2026-08-30 — Close the QA coverage gaps, and the permission leak they exposed

Reviewing the previous sweep's own coverage against "every feature" found real holes: custom fields, saved views, the column chooser, bulk actions, non-admin behaviour in the browser, report content, the import wizard run to completion, and attachment download/delete were all untested or tested only through the API. Added `e2e/qa/coverage.spec.ts` — 9 tests — to close them.

- **A read-only User was shown write controls.** "Add Asset", "Add Location" and every other create button rendered for the `User` role, which the API then correctly refuses. The user would fill in an entire form and be told "Access denied" on save. The auth context now exposes `canWrite` (Admin or Operator), and all ten list pages gate their create button on it. This was a genuine defect, found only by signing in as a non-admin *in the browser* — the API-level role checks had passed all along.
- Custom fields are now covered end to end: defined on a type, persisted, rendered on the asset form for that type, and the value saved to the record.
- Saved views, the column chooser, and bulk status/archive from the action bar are driven through the UI.
- Reports are asserted to render a table or chart rather than merely load, and the import wizard is run through validation to a completed import with the record verified afterwards.

Verified: 197/197 API checks and **68/68** e2e green on three consecutive runs against a freshly wiped database, plus the backend suite, 46 frontend unit tests, lint and build.

## 2026-08-30 — Full feature QA sweep: harnesses, and four defects they found

Exercised **every** feature, through the API and through the browser, looping until both suites ran clean from an empty database three times over.

**Harnesses added** (repeatable, not one-off):
- `scripts/qa/api_smoke.py` — signs in through the real Easy Auth path and calls **all 178 endpoints** across 30 controllers with a full data fixture: lifecycle actions (check-out/in, retire, sell, renew, seats, offboard), bulk operations, CSV import/export, attachments, model images, SCIM, plus role enforcement and CSRF behaviour. **197 checks, none skipped.**
- `apps/web/e2e/qa/` — 46 Playwright tests covering every route, all settings and report tabs, CRUD through the real dialogs for every entity, the lifecycle workflows, table sorting/pagination/bulk selection, exports, global search, the import wizard, notifications, attachments and the audit log. Every page is watched for **uncaught errors, console errors and failed API calls** — the check that would have caught the 500-on-`/` reported earlier.

**Defects found and fixed:**
- **CSRF tokens were re-issued on every response.** The cookie repository minted a new `XSRF-TOKEN` per response even when the request presented a valid one. For a SPA that fires parallel requests this is a live fault: the page reads the cookie, another response replaces it, the browser then sends the new cookie with the old header, and the write is rejected — an unexplained "Access denied" on save, or a bounce to sign-in. Replaced with a required custom header (`X-Requested-With`), which a cross-origin page cannot set without a CORS preflight this API doesn't grant. It has no lifecycle, so nothing can rotate and nothing can race. `SameSite=Lax` on the session cookie remains the first layer.
- **A user could be refused on their own first request.** After provisioning, the code re-read the user to collect roles, but the role rows had just been written in the same transaction and could come back missing — so the caller was authenticated with *no* authorities and got a 403 from method security. It affected the first ever request, and intermittently a first sign-in arriving as a parallel burst. The resolved roles are now carried with the result instead of being re-read. Reproduced by an integration test that fires 8 concurrent first writes; it fails without the fix.
- **A sort or page chosen straight after load could be silently discarded.** The search debounce rewrote the query string ~300ms after *every* list-page mount, resetting `page` to 1 and able to wipe a sort picked inside that window. It now writes only when the search box actually differs from the URL. Guarded by an e2e test that clicks a column header immediately, without settling.
- **The Applications list had an unlabelled export button.** It was the only one of six lists not using the shared `ExportButton` — a bare icon with no accessible name, invisible to screen readers and to any test looking for "Export", and missing the "Export Selected (N)" affordance. Now uses the shared component.

**Also:** SCIM enabled in the dev profile so its endpoints are covered rather than untested; the stale `/api/v1/auth/sso-config` permit rule and the `generate-saml-keys.sh` script removed (both dead since SAML went); e2e fixtures given collision-proof ids after parallel workers sharing a millisecond produced spurious 409s; and several specs hardened to wait for data before acting.

Verified: 197/197 API checks and 58/58 e2e green on three consecutive runs against a freshly wiped database, plus the backend suite (66 tests), 46 frontend unit tests, lint and build.

## 2026-08-30 — Unknown paths return 404, and local sign-in lands on the app

- **An unmatched path was reported as `500 An internal error occurred`** with an error id and a full stack trace logged as "Unhandled exception". `NoResourceFoundException` fell through to the catch-all handler, so something as ordinary as a browser requesting `/favicon.ico` produced an alarming 500 and log noise. It now returns a plain `404 Not found`. Pre-existing, but newly visible because signing in lands on `/`.
- **The local Easy Auth emulator sent you nowhere useful.** Its post-sign-in redirect defaulted to `/`, which is correct on App Service and when the SPA proxies `/.auth` — but hitting the API's own port directly, `/` is not a page, so picking an identity dropped you on the API root (the 500 above). The default is now configurable, and the dev profile points it at `http://localhost:5173/`. The sign-in page also states where it will send you. Redirects supplied in the query string are still restricted to same-site paths; only the configured default may be absolute, since it comes from deployment configuration rather than the caller.
- Verified: signing in at `http://localhost:5115/.auth/login/aad` now redirects to the running app; `/`, `/favicon.ico` and an unknown API path all return `404 {"error":"Not found"}` with no stack traces logged. Backend suite green including a new regression test; e2e green.

## 2026-08-30 — Azure Blob Storage for attachments (Entra migration)

- App Service container storage is **ephemeral** — uploads written to local disk are lost on restart, scale or redeploy — so attachments needed somewhere durable. Added `AzureBlobStorageService` behind the existing `StorageService` interface, selected by `STORAGE_TYPE=azure-blob`; `LocalStorageService` remains the default and the right choice for development.
- Authentication prefers a **managed identity** (`DefaultAzureCredential`) via `BLOB_ACCOUNT_NAME`, so no storage secret is configured anywhere; `BLOB_CONNECTION_STRING` is a fallback. The client is built **lazily** and the container created on first use, so a storage outage fails the request that needs storage rather than stopping the app from booting.
- `LocalStorageService` now logs a loud `STORAGE:` warning when it starts outside a dev profile. A warning rather than a hard failure, because a deployment may legitimately have mounted durable storage — but silently losing people's uploads on the next restart is the worse outcome.
- Extracted `StorageKeys.validate` so both implementations share it. The local one already guarded against traversal; the blob one needed the same, where a leading slash or `..` writes silently to an unintended path rather than erroring.
- **Fixed a flaky e2e test** found while verifying: the assets bulk-selection spec clicked "select all" as soon as the header checkbox appeared, which renders with the empty table — so if rows hadn't arrived it selected nothing and the bulk bar never showed. It grew flakier as the table filled up. Now waits for a row.
- Verified: backend suite green (incl. 8 new storage tests); attachment upload and download exercised end to end against the API and confirmed on disk; the ephemeral-storage warning confirmed to fire in a production-shaped container run; 12 e2e green on three consecutive runs.

## 2026-08-30 — Azure App Service deployment configuration (Entra migration)

- Added `infra/azure/` with the file-based Easy Auth configuration and a deployment guide: the Entra app registration steps (app roles `Admin`/`Operator`/`User`, **Assignment required = Yes**, group assignment needing Entra ID P1), the `az rest` call that points the site at `auth.json`, the required application settings, and the storage caveat.
- **Two auth variants, with the trade-off written down.** `auth.json` uses `AllowAnonymous` and lets the application enforce access (it fails closed); `auth.require-authentication.json` uses `RedirectToLoginPage` and gates at the platform, which then *requires* `excludedPaths` for health and SCIM or probes and provisioning break. The first is the default and the tested one — under `RedirectToLoginPage` a background `fetch` with an expired session follows the redirect and receives sign-in HTML where it expected JSON. `excludedPaths` needs file-based configuration; the portal cannot express it.
- Noted that `tokenStore` must stay enabled: Easy Auth's claims mapping — which is what puts the object id, email, name and `roles` claims into `X-MS-CLIENT-PRINCIPAL` — depends on it.
- Added `apps/api-kt/Dockerfile` (there wasn't one): multi-stage, JRE-only runtime, non-root user, `MaxRAMPercentage` set, and SIGTERM reaching the JVM so Spring's graceful shutdown works.
- **Suppressed Spring's `UserDetailsServiceAutoConfiguration`.** With no `UserDetailsService` bean left, Boot was auto-configuring an in-memory user and logging "Using generated security password" at every start. The account is unusable — this app defines its own filter chain with no form login or basic auth — but the line reads like a live credential in production logs.
- Verified by building and running the image in a production-like shape: without `EASY_AUTH_ENABLED` it **aborts** with the fail-closed message; with it set and no profile, it boots, logs "Security configuration validated successfully", serves `/api/v1/health` 200, returns 401 for an unauthenticated API call, has no emulator endpoint, and emits no generated-password line.

## 2026-08-30 — Remove local accounts, passwords and application-issued tokens (Entra migration)

- Every user now signs in with Microsoft Entra through App Service, so the app's own account system is gone: `JwtAuthenticationFilter`, `TokenService`, `LoginRateLimitService`, `PasswordValidator`, `POST /api/v1/auth/login`, admin user creation, admin password reset and self-service password change are all deleted, along with the `jwt.*` / `app.admin.password` / `auth.local-login` settings, the `passwordEncoder` bean and the **jjwt** dependency. `JwtUserDetails` is now `AuthenticatedUser` — nothing about the principal is JWT-shaped any more.
- **Migration `V018`** drops `users.password_hash` and `users.token_invalidated_at`. The first held bcrypt hashes for accounts that can no longer authenticate by any route; the second revoked application-issued JWTs early, and there are none — a role or access change now takes effect on the user's very next request, because roles are re-read from the Entra claims each time. Existing rows are left in place: a `LOCAL` user simply has no way in, and shows as such in the users list.
- **Two places were quietly lying to the user, now corrected.** The users tab offered role editing and the profile tab offered name/email editing — but both are re-applied from the Entra claims on every request, so a change would have appeared to save and then reverted moments later. The users tab is now a read-only list of who has access, and the profile tab shows name/email/role as directory-managed values with only the theme editable.
- Deactivation is kept as the one local control, because an Entra assignment change can take time to propagate and an administrator sometimes needs to cut off access to *this* application immediately. The "last active administrator" guard is preserved. A deactivated user is refused with a distinct reason.
- **Refusal reasons are now distinguished** (`no_role_assigned`, `account_deactivated`, `account_conflict`) rather than all reporting "no role assigned" — a deactivated user was being told to go and ask for a role they already had.
- **Fixed a genuine concurrency defect in JIT provisioning.** A user's first sign-in arrives as a burst, because the SPA issues several requests in parallel as it loads. Each found no row, each inserted, and all but one hit the unique constraint — so a brand-new user could be bounced as unauthenticated on their very first visit. Provisioning now retries once, adopting the row the winning request created. Found by running the e2e suite against a clean database; a new integration test fires 8 concurrent first requests and asserts all succeed with exactly one user row (it fails without the fix).
- **e2e specs no longer depend on ambient database contents.** Four specs assumed assets, people or asset models already existed — invisible until the database was wiped. They now create what they need through the API (a new `apiPost` helper), and one that located a dropdown by position now targets it by name. The suite passes from an empty database.
- Verified: backend 56 tests incl. the new concurrency guard; frontend 49 unit tests, lint, build; **12 e2e green against a freshly wiped database**. Manually confirmed: `password_hash`/`token_invalidated_at` gone from the schema, the login endpoint no longer exists, JIT provisioning yields an `ENTRA` user, the last-admin guard holds, and a revoked user gets `403 account_deactivated`.

## 2026-08-30 — Remove SAML SSO (Entra migration)

- Azure App Service authenticates against Entra over OIDC and hands us the identity in headers, so the app's own SAML service-provider implementation is redundant. Deleted `SamlConfig`, `SamlAuthSuccessHandler`, the dedicated SAML security filter chain, the `saml.*` configuration block, the `/api/v1/auth/sso-config` discovery endpoint (the SPA no longer asks — sign-in is always `/.auth/login/aad`), and the `/saml2` + `/login/saml2` proxy rules from nginx and the Vite config.
- Dropped the `spring-security-saml2-service-provider` dependency and, with it, the extra Shibboleth Maven repository the build needed to resolve OpenSAML — one fewer non-Maven-Central source in the dependency chain.
- `ScimService`'s default role was reading `saml.default-role`, an odd coupling now that SAML is gone; it reads `scim.default-role` instead (same default, `User`).
- The JIT-provisioning link rule still adopts accounts left over from the SAML integration (identity-provider-managed, no `external_id` yet), so any user provisioned under the old scheme carries over on first Entra sign-in rather than being orphaned.
- Verified: full backend suite (65 tests), frontend build, lint and unit tests pass.

## 2026-08-30 — CSRF protection for cookie-authenticated requests (Entra migration)

- `SecurityConfig` disabled CSRF with the note *"Re-evaluate if cookie auth is added"*. Cookie auth has now been added — the App Service session cookie is attached by the browser to cross-site requests, which is exactly the condition CSRF exists for — so protection is enabled: `CookieCsrfTokenRepository` issues a readable `XSRF-TOKEN`, and the SPA echoes it in `X-XSRF-TOKEN` on every write. A `CsrfCookieFilter` forces the token to materialise, since a JSON API renders no template and Spring otherwise defers (and so never sends) it.
- **Requests carrying `Authorization: Bearer` are exempt.** They authenticate by token, not cookie, and a browser cannot attach a custom header cross-origin without a CORS preflight this API refuses — so they are not forgeable. This keeps SCIM machine callers working. `/api/v1/auth/login` is exempt too (unauthenticated, no session to escalate; it goes with local login).
- A CSRF rejection returns **401, not 403**, because Spring evaluates CSRF ahead of the authentication filters, so the rejection is raised against an anonymous context. The security property is identical and the status is benign either way: a forgery gets nothing, while our own SPA meeting a stale token is sent to sign in, which mints a fresh session and token and self-heals. Asserted and explained in the test rather than papered over.
- Integration tests gained a `test` profile that enables the Easy Auth emulator, plus `signInWithCookie()` and a non-redirect-following client on the shared base class — CSRF can only be tested meaningfully against a real cookie session. (Worth noting: the default `TestRestTemplate` follows redirects, which silently turns a sign-in 302 into a request for the target page.)
- **Rate limiter is now configurable** (`RATE_LIMIT_PER_MINUTE`, default unchanged at 120/min). The e2e suite drives far more traffic from one IP than a real user, and was intermittently tripping the limit — a pre-existing flakiness the extra test pushed over the edge. Dev and test profiles raise it; production is unaffected.
- Verified: full backend suite (65 tests, incl. 5 new CSRF integration tests), 49 frontend unit tests, lint, build, and **12 e2e** — including a new one that performs a real create through the UI and asserts the browser actually receives the `XSRF-TOKEN` cookie, which is what proves CSRF hasn't silently broken every write in the app.

## 2026-08-30 — Frontend switches to Easy Auth cookie sign-in (Entra migration)

- The SPA no longer holds a token. `auth-context` asks `/api/v1/auth/me` with the platform session cookie (`credentials: "same-origin"`), the login form and its SSO-token-in-fragment handshake are deleted, and sign-in/sign-out are full-page navigations to `/.auth/login/aad` and `/.auth/logout` — the endpoints App Service publishes and the local emulator mirrors. `api-client`, the attachments API and the asset-model image hook drop their `Authorization` headers and `localStorage` token handling.
- **Loop guard.** A user the identity provider signs in but the app refuses (no app role) would otherwise be redirected to sign-in, succeed, and return refused — forever. The API now distinguishes the two: the Easy Auth filter marks the request when *it* is the one refusing, and the entry point answers **403 `no_role_assigned`** instead of 401. The SPA renders an "Access not granted" page for that state and only redirects on a true 401. Covered by a new e2e test.
- **Fixed a leaked connection found while doing this.** The auth check ignored a late response via a `cancelled` flag without reading its body, so under React StrictMode's double-invoked effects one response body was never drained and the browser held the connection open indefinitely — the page never reached network idle (which is what surfaced it: every `waitForLoadState("networkidle")` e2e test timed out). Now aborts via `AbortController` on unmount, and drains bodies it doesn't parse.
- The four e2e specs each carried their own copy of a password-login helper; replaced with a shared `e2e/auth.ts` that signs in through `/.auth/login/aad`, so the tests exercise the real auth path and can pick a role.
- `vitest.config.ts` gained the `@/...` alias it had never needed before (no unit-tested module had used one).
- Verified: build, lint, 44 unit tests, full backend suite, and **11 e2e** (10 existing + the new access-denied guard) all pass.

## 2026-08-30 — Local emulator for App Service Easy Auth (Entra migration)

- Production will run on Azure App Service, where the platform's auth sidecar authenticates against Entra and injects `X-MS-CLIENT-PRINCIPAL`. There is no sidecar on a developer machine, and standing up a real App Service purely to develop against isn't worth the running cost. Added `LocalEasyAuthEmulator`, which produces the identical header from a chosen developer identity, plus local stand-ins for `/.auth/login/aad`, `/.auth/logout` and `/.auth/me` matching the App Service contracts.
- The point is that local dev now exercises the **same** `EasyAuthPrincipalFilter` code path as Azure, rather than a parallel local-login path that would drift. Transitioning to App Service is switching the emulator off — no code change. The dev profile enables it automatically; four identities ship (`admin`/`operator`/`user`, plus `norole` to exercise the refusal path), overridable via `EASY_AUTH_LOCAL_IDENTITIES`.
- Guarded on two levels: the component refuses to construct unless a `dev`/`local`/`test` profile is active (it mints identities without a password), and it logs a loud warning when it does start. The request wrapper is **authoritative** for the `X-MS-CLIENT-PRINCIPAL*` headers — a client-supplied one is discarded rather than passed through, mirroring the platform's guarantee, so the emulator can't turn a dev machine into one where any caller asserts any identity via a header.
- `/.auth` added to the Vite dev proxy and the nginx location block (inert on App Service, where the sidecar answers those paths first). Sign-in/sign-out honour `post_login_redirect_uri`/`post_logout_redirect_uri`, restricted to same-site absolute paths so it can't be used as an open redirect.
- Verified end to end against a running API: picker renders; sign-in sets the cookie and 302s; `/auth/me` returns the JIT-provisioned `ENTRA` user with the right role; Admin-only `/api/v1/users` gives 200 for `admin` and 403 for `user`; `norole` is refused 401 **and provisions no database row** (confirmed in MySQL); a forged `X-MS-CLIENT-PRINCIPAL` with no cookie is ignored (401); logout clears the cookie. Full `./gradlew test` green, including 7 new emulator tests — one asserts the emitted header round-trips through the real `EasyAuthPrincipalParser`.

## 2026-08-30 — Easy Auth refuses a principal with no Entra app role (Entra migration)

- Follow-up to the Easy Auth filter: a principal carrying no app role was admitted with a default read-only `User` role. Corrected to a **hard refusal** — an app role *is* how access is granted, so "signed in but holds no role" is an Entra misconfiguration, not a user to wave through with reduced rights. Admitting them also quietly created accounts that looked provisioned but had never been authorised.
- Roles are now resolved **before** the `users` table is touched, so a refused sign-in leaves no provisioned row behind. Same refusal when the claim's app roles map to no local role at all. Both paths log the offending claim values so an admin can diagnose it from the app logs.
- Removed the now-meaningless `EASY_AUTH_DEFAULT_ROLE` setting.
- Verified: full `./gradlew test` green, including 6 new `EasyAuthUserServiceTest` cases covering no-role refusal (asserting nothing is provisioned), unmapped-role refusal, deactivated users, the configured role mapping, and the LOCAL-account auto-link guard.

## 2026-08-30 — Azure App Service (Easy Auth) principal filter (Entra migration, PR 1/7)

- First step of the move to Azure App Service with Entra SSO for all sign-ins. Adds `EasyAuthPrincipalFilter`, which authenticates a request from the `X-MS-CLIENT-PRINCIPAL` headers injected by App Service's auth sidecar, plus `EasyAuthUserService`, which JIT-provisions the local `users` row on first sign-in and mirrors Entra **app roles** into `user_roles` on every request (compare-then-write, so the steady state is read-only). Roles stay authoritative in Entra: assign groups to the `Admin`/`Operator`/`User` app roles on the app registration and they arrive in the `roles` claim.
- Claim handling is deliberately tolerant: Easy Auth's default claims-mapping means a claim can arrive under its short OIDC name (`oid`, `roles`, `preferred_username`) or the long WS-Federation URI, so the parser accepts both and honours the principal's own `name_typ`/`role_typ`. It falls back to the sibling `X-MS-CLIENT-PRINCIPAL-ID`/`-NAME` headers when the claims blob is sparse, and treats a malformed header as "no identity" (request continues unauthenticated) rather than an error.
- Entirely additive and **off by default** (`EASY_AUTH_ENABLED=false`). That flag is the trust boundary — the headers are only unforgeable while every route to the container passes through the auth sidecar, so it must not be enabled outside an App Service configured that way. Existing JWT/SAML/local login are untouched and remain the active path until PR 4 removes them.
- Account-takeover guard carried over from the SAML handler and tightened: an existing account is auto-linked to an Entra identity only when it is already IdP-managed *and* has no `external_id` yet. `LOCAL` accounts are never auto-linked, so the break-glass admin can't be claimed by anyone who obtains a matching mailbox address.
- Verified: `./gradlew test` — 6 new `EasyAuthPrincipalParserTest` cases and the rest of the unit suite pass.

## 2026-08-29 20:55 — Fetch-join a person's assigned assets (fifth sweep, perf)

- `PeopleController.getAssignedAssets` loaded a person's assets without a fetch join, then read `assetType`/`location` per asset — batched by the global `default_batch_fetch_size` but still avoidable follow-up queries, and inconsistent with the sibling `getAll` which uses `withFetch`. Added `withFetch("assetType","location")` so it loads in one query. Verified: full suite passes; endpoint 200. (The history-timeline and seat-list lazy loads flagged alongside this were left as-is: they're already batched by `default_batch_fetch_size=100`, and a collection fetch-join with a Pageable would regress to in-memory pagination.)

## 2026-08-29 20:30 — Fix list column headers stuck on ascending (fifth sweep, correctness)

- The shared `useListPage` built the TanStack controlled-sort state with the *backend* field name as the row `id`, but headers compare `column.getIsSorted()` against the *column* id. On any page whose `sortFieldMap` changes the field's case (People: `fullName`→`fullname`, `jobTitle`→`jobtitle`), the ids never matched, so `getIsSorted()` was always false and the header could only ever sort ascending — descending was unreachable. Now the sort state carries the column id (via a reverse of `sortFieldMap`) while the URL keeps the backend field. Identity-mapped pages (assets/certificates/applications) are unaffected. Verified: build, lint, unit, and a new `people-sort` e2e (header toggles desc→asc) pass; full e2e green.

## 2026-08-29 20:10 — Audit-log failed logins against SSO accounts (fifth sweep, security)

- The login handler audited every failure branch (unknown user, inactive, wrong password) except the non-LOCAL/SSO branch. That left two gaps a final audit surfaced: local-login attempts against SSO-provisioned usernames produced no `LoginFailed` trail (a monitoring blind spot on high-value accounts), and the skipped synchronous audit insert made that branch return faster than the others — a residual timing signal that partially undercut the enumeration hardening. Added the matching `auditService.log(...)`. Verified: full suite passes.

## 2026-08-29 19:45 — Selected-rows export honours the requested sort (fifth sweep, consistency)

- Exporting selected rows by `ids` used `findAllById` (unspecified order) for certificates, applications and people, silently ignoring the `sortBy`/`sortDir` params — while the assets export already honoured them. Switched the three ids-branches to a sorted spec (`id IN (...)` + `sortOf`, with the same `withFetch` join as the filtered branch), so a selected-rows CSV comes out in the table's order. Verified: full suite passes; a people ids-export with `sortBy=fullname&sortDir=desc` returns Diana→Charlie→Bob→Alice.

## 2026-08-29 19:25 — Extract shared SortableHeader for data tables (fifth sweep, tidy)

- The sortable column-header button (ghost button + `ArrowUpDown` that toggles sort) was hand-written ~16 times across 7 `columns.tsx` files, and the icon size had drifted (`h-3.5` in assets vs `h-4` everywhere else). Extracted a single `SortableHeader` component and replaced all 16 call sites, standardising the header style and icon size. Removed the now-unused `ArrowUpDown`/`Button` imports. Verified: build, lint, and 9 e2e pass.

## 2026-08-29 19:05 — Validate stored theme (fifth sweep, hardening)

- `useTheme` read `localStorage.getItem("theme") as Theme` — a blind cast that trusts a possibly stale/garbage stored value as a valid `Theme`. Now validated against the allowed set, falling back to `"system"`. Verified: build, lint, unit tests pass.

## 2026-08-29 18:55 — Certificates toolbar uses shadcn Popover (fifth sweep, consistency)

- The certificates "More" filter was the last hand-rolled dropdown (a `<button>` toggling an absolutely-positioned `<div>` with its own `useState`/`useRef`/`mousedown` click-outside), violating the CLAUDE.md "use shadcn, don't hand-roll primitives" rule and diverging from the assets toolbar. Replaced with the shared shadcn `Popover` + `Button`, gaining focus management and Escape-to-close. Verified: build, lint, e2e (incl. /certificates) pass.

## 2026-08-29 18:35 — Serialize seat assignment to enforce maxSeats (fifth sweep, hardening)

- `POST /applications/{id}/seats` counted seats then inserted without atomicity or a DB cap, so two concurrent assignments could both pass the `used >= maxSeats` check and over-allocate. `assignSeat` (already `@Transactional`) now fetches the application via a `PESSIMISTIC_WRITE` lock (`findByIdForUpdate`), so concurrent assigns serialize on the application row and the count+insert is atomic. Verified: new `SeatAssignmentIntegrationTest` (maxSeats=1 → first seat 200, second 409); full suite passes.

## 2026-08-29 18:15 — Personal alerts: bulk dedup lookup instead of per-row exists (fifth sweep, perf)

- `AlertProcessingService.processPersonalAlerts` ran one `existsBy…` query per matching entity per threshold per rule (an N+1) to skip already-notified items — the same N+1 `createGlobalNotifications` was already refactored away from. Now each rule pre-loads its user's existing notification keys once (`findByUserId`) into a `Set<(type, id, thresholdDays)>` and checks membership in memory. Dedup behaviour is unchanged (auto-flush means multi-rule same-user runs still see prior inserts). Verified: `PersonalAlertsIntegrationTest` extended to assert a second run creates no duplicate; full suite passes.

## 2026-08-29 17:55 — Type asset-status fields as AssetStatus (fifth sweep, type safety)

- `AssignedAsset.status` (person detail) and `LocationAsset.status` (location detail) were typed `string`, forcing `as AssetStatus` casts at the `<AssetStatusBadge>` call sites that hid any backend/enum drift. Typed both fields as the `AssetStatus` union and removed the two casts (+ orphaned imports). Deliberately left the certificate/application assigned-status fields and the polymorphic report status as-is — they are *not* `AssetStatus`. Verified: build, lint, 40 unit tests, 9 e2e pass.

## 2026-08-29 17:40 — Certificates stop leaking archived custom-field values (fifth sweep, consistency)

- Certificate responses mapped custom-field values without filtering archived definitions, while asset and application responses skip them — so an archived custom field kept showing on certificates only. Added the `!def.isArchived` filter to both the single-entity and batch certificate CFV mappers, matching the siblings. Verified: full suite passes; cert list 200.

## 2026-08-29 17:25 — Remove verified dead code (fifth sweep, tidy)

- Deleted code with zero references (grep-confirmed across main + test): the unused `UserDto` DTO (the API uses `UserDetailDto`); the unused `findAllByOrderBySentAtDesc` alert-history query; the unpaged `findByAssetIdOrderByTimestampDesc`/`findByPersonIdOrderByTimestampDesc` overloads (every caller now passes a `Pageable`); two dead `private fun isAdmin()` helpers (authorization is via `@PreAuthorize`) plus their now-orphaned `SecurityContextHolder` imports; and the never-called `assetModelsApi.getPaged` + its unused `AssetModelQueryParams` type. Verified: full backend suite, frontend build + lint pass.

## 2026-08-29 17:05 — Close login account-enumeration vectors (fifth sweep, security)

- The login endpoint let an attacker enumerate accounts two ways: an SSO account returned a distinct "This account uses SSO…" message (vs the generic error for unknown users), and bcrypt ran only for existing local users, so response time revealed whether a username existed. Now every failure mode (unknown user / SSO account / inactive / wrong password) returns the **identical** generic 401 and spends **exactly one bcrypt** — a real check, or a dummy against a fixed hash computed from the same encoder. Verified at runtime: unknown-user and wrong-password responses are byte-identical and comparable in latency (~60ms, bcrypt-dominated); valid login still 200.

## 2026-08-29 16:45 — Close upload stream leaks + return 413 for oversized uploads (fifth sweep, hardening)

- **Stream leaks.** The CSV import (`ImportController` validate + execute), attachment upload (`AttachmentsController`), and asset-model image upload (`AssetModelsController`) handed `MultipartFile.inputStream` to a `CSVReader`/Tika and never closed it — a file-descriptor leak per call. Each now wraps the read in `.use { }` so the reader/stream is closed.
- **Oversized upload → 413.** With the 10MB multipart cap, an over-limit upload threw `MaxUploadSizeExceededException`, which fell through to the generic 500. Added a handler returning **413** with a clear message. Verified at runtime: an 11MB upload returns 413, a normal upload 200; full suite passes.

## 2026-08-29 16:25 — Align AssetModels list endpoint with siblings (fifth sweep, bug/consistency)

- `AssetModelsController.getAll` returned an ad-hoc `mapOf("items"…, "total"…)` instead of the standard `PagedResponse` every other list endpoint uses. The frontend `PagedResponse<T>` reads `totalCount`, so it saw `undefined` and its page-through loop only terminated on an empty page — one wasted request per dropdown load. Now returns `PagedResponse(...totalCount)`. Also aligned three more divergences: case-insensitive sort keys (`when(sortBy.lowercase())`), a stable `id` sort tiebreak, and LIKE-wildcard escaping via `SqlUtils.escapeLikePattern`. Verified: full suite + asset-model e2e pass; the list now returns `totalCount`.

## 2026-08-29 16:05 — CSV exports fetch-join to-one relations (fifth sweep, perf)

- The list endpoints fetch-join their denormalised to-one relations, but the `/export` paths (up to `CsvExport.MAX_ROWS` = 100k rows) did not, so every name column was a lazy load — softened to ~ceil(N/100) queries per relation by `default_batch_fetch_size`, but still thousands of round-trips on a large export. Added `.and(withFetch(...))` to the filtered-spec branch of the asset (`assetType`,`location`,`assignedPerson`), certificate (`certificateType`), application (`applicationType`) and people (`location`) exports. Only to-one relations are fetched, so pagination's count query is unaffected (FetchSpecs skips the join on the count query). Verified: full suite passes; all four exports return 200 with data at runtime.

## 2026-08-29 15:45 — Global search no longer hydrates whole collections to count (fifth sweep, perf)

- The global search (a typeahead endpoint hit on nearly every keystroke) computed each matched person's / location's "N assets" figure by loading that entity's entire LAZY `assignedAssets` / `assets` collection into memory and counting in Kotlin — so a single busy location with thousands of assets hydrated thousands of `Asset` entities per keystroke. Replaced with two batched grouped-`COUNT` queries (`countActiveByAssignedPersonIds` / `countActiveByLocationIds`) that return `[id, count]` for all matched rows at once. Empty-match sets skip the query. Verified: new `SearchCountIntegrationTest`, full suite, and a runtime check ("Head Office → 11 assets") all pass.

## 2026-08-29 15:26 — Clear newly-disclosed dependency vulns (fifth sweep, security)

- The CI dependency-audit gate (blocking on shipped deps) flagged three high/moderate advisories disclosed since the last clearance: `react-router`/`react-router-dom` (RSC-mode CSRF bypass, GHSA-qwww-vcr4-c8h2), `nanoid` (infinite loop on size 0), and `postcss` (arbitrary .map read). `npm audit fix` bumped react-router-dom to 7.18.3 (+ transitive fixes) with no breaking changes — **0 vulnerabilities** now. Verified: build, 40 unit tests, lint, and 9 e2e pass.

## 2026-08-29 15:20 — Fail closed on default secrets (fifth sweep, security)

- `SecurityStartupValidator` only aborted startup when the profile was *not* dev, but it treated an unset/`default` profile as dev — so a production deploy that forgot `SPRING_PROFILES_ACTIVE` would boot on the committed default JWT signing key and `admin123` admin password (full auth-bypass / token-forgery exposure) with only a log line. Inverted to **fail closed**: the app now tolerates default secrets *only* under an explicit `dev`/`test`/`local` profile and refuses to start otherwise, with an actionable error. The check now reads `Environment.activeProfiles` directly (a `@Value("\${spring.profiles.active}")` isn't populated by test `@ActiveProfiles`). Integration tests run under `@ActiveProfiles("test")`; local runs and docs/CLAUDE.md now use `SPRING_PROFILES_ACTIVE=dev`. Verified: full test suite passes; a no-profile boot aborts with the security error (port stays closed); a `dev` boot starts and login returns 200.

## 2026-07-19 18:20 — Shared expiry-date cell (fourth sweep)

- The application/licence table coloured its expiry-date cell by urgency (red once expired, orange within 30 days) but the certificate table rendered a plain date — so the same "expiring soon" signal was present on one list and missing on the other. Extracted a shared `ExpiryDateCell` and used it in both, so expiry cells read identically everywhere. Removed the per-table inline urgency helper. Verified: build, lint, and e2e (certificates + applications) pass.

## 2026-07-19 18:00 — Chart accessibility (fourth sweep)

- The dashboard charts had no accessibility affordances — a screen reader saw an unlabeled SVG and keyboard users couldn't inspect data points. Added Recharts' `accessibilityLayer` (keyboard navigation + screen-reader data-point announcements) and a descriptive `aria-label` to all five charts (assets by age/location/type, value by location, and the status donut). Verified: build, lint, and 9 e2e pass.

## 2026-07-19 17:40 — Backend polish: alert-email BCC + SCIM transactions & audit (fourth sweep)

- **Alert digest recipient privacy.** `EmailService` put every recipient of the group alert digest in the `To` field (both SMTP and Graph), so each recipient could see everyone else's address. Now the recipients are **BCC'd** (To = the sender), for both providers.
- **SCIM writes were untransactional and unaudited.** `ScimService.createUser` saved the user then its role in separate auto-commits (a role failure left an orphaned user), and none of create/replace/patch/deactivate emitted an audit event — violating the "all writes are audited" rule the rest of the app follows. Added `@Transactional` to all four writes and an `AuditEntry` (actor `SCIM`) for each. Verified at runtime: a SCIM `POST /Users` returns 201 and writes a `Created / User / … / SCIM` audit row; full `./gradlew test` passes.

## 2026-07-19 17:20 — JacksonConfig honours spring.jackson.* (non_null now applied) (fourth sweep)

- `JacksonConfig` exposed a hand-built `ObjectMapper` bean, which made Spring Boot's `JacksonAutoConfiguration` back off — silently discarding everything configured under `spring.jackson.*`, most importantly `default-property-inclusion: non_null`. As a result null fields were serialized on every response despite the config asking otherwise. Replaced the bean with a `Jackson2ObjectMapperBuilderCustomizer` that only layers on the two lenient date deserializers, so Boot's auto-configured mapper (Kotlin module, `write-dates-as-timestamps: false`, and `non_null`) is preserved. Responses now omit null fields as intended (smaller payloads).
- Verified this is safe for the client: the SPA doesn't schema-validate API responses, and its only `=== null` checks are on locally-computed values. Full `./gradlew test` (incl. the flexible-date deserialization tests) passes, and all 9 e2e specs pass with the frontend running against the `non_null` API (assets/applications/certificates/types/templates/people/locations render correctly with null fields omitted).

## 2026-07-19 17:00 — Security-header hardening: CORS credentials + X-XSS-Protection (fourth sweep)

- **CORS `allowCredentials` false.** Auth is a stateless JWT in the `Authorization` header (no cookies — confirmed: the SPA reads the token from localStorage, never sends `withCredentials`), so cross-origin credentials are never needed. Set `allowCredentials = false` so the API doesn't advertise/permit credentialed cross-origin requests. No functional change (the SPA is served same-origin via proxy; the allowed origin is still echoed).
- **`X-XSS-Protection: 0`.** Was `1; mode=block`. Per current OWASP guidance the legacy browser XSS auditor should be disabled — it's removed from modern browsers and a side-channel risk where still present; the CSP is the real defence. Switched to `DISABLED`.
- Verified: full `./gradlew test` passes; header confirmed `X-XSS-Protection: 0`; CORS preflight from the allowed origin returns Allow-Origin/Methods with no Allow-Credentials; login 200.

## 2026-07-19 16:40 — Design-token polish: destructive-foreground, reduced-motion, table tokens (fourth sweep)

- **Invisible destructive text.** In light mode `--destructive-foreground` was `#EF4444` — identical to `--destructive` — so any `text-destructive-foreground` on a `bg-destructive` fill rendered red-on-red (invisible). Set it to white.
- **Reduced motion.** Added a `@media (prefers-reduced-motion: reduce)` rule that collapses animations/transitions to ~instant (dialogs, popovers, skeletons, chart transitions) for users who ask for less motion — previously nothing was honoured.
- **Table tokens.** `ui/table.tsx` hardcoded `slate-*` for the header background, row dividers, and row hover instead of theme tokens, so they didn't track the palette. Switched to `bg-muted/50` and `divide-border` (matching the already-tokenised `TableFooter`).
- Verified: build, lint, and 9 e2e pass.

## 2026-07-19 16:20 — Migrate person/location/user dialogs to shared FormDialog (fourth sweep)

- The person, location and user create/edit dialogs hand-rolled their own dialog chrome (bare `DialogContent`, small header, `outline` Cancel button, `space-y-4` body, "Saving…" ellipsis) while six other entity dialogs used the shared `FormDialog` (bordered header, scrollable body, `bg-muted/50` footer with `ghost` Cancel). Migrated all three onto `FormDialog` (chrome only — every field, schema, and reset-on-open effect is unchanged), so all create/edit dialogs now look and behave identically. The user dialog's SSO note moved to `FormDialog`'s `description` slot (rendered as an accessible `DialogDescription`). Verified: build, lint, and e2e (added `/people` + `/locations` cases to the FormDialog spec) pass.

## 2026-07-19 16:00 — Assets "More Filters" on shadcn Popover (fourth sweep)

- The Assets "More Filters" panel was a hand-rolled dropdown: a plain `<button>` toggling an absolutely-positioned `<div>`, with its own `useState`/`useRef`/`mousedown` click-outside effect and no focus trap or Escape handling. Replaced it with the shared shadcn `Popover` + a `Button` trigger (variant `outline`, primary tint when advanced filters are active) — gaining focus management, Escape-to-close, and correct positioning for free, and removing the bespoke effect. Completes the toolbar cleanup (after #198 native selects and #199 FilterChip). Verified: build, lint, 7 e2e pass.

## 2026-07-19 15:45 — Rebuild FilterChip on shadcn Select (fourth sweep)

- The `FilterChip` dropdown (Type/Status/etc. across the assets, certificates, people, applications and audit-log toolbars) was a hand-rolled listbox: no arrow-key navigation, no typeahead, no roving focus, and a manual `mousedown` click-outside handler. Rebuilt its internals on the shared shadcn `Select` (Radix) so it gains keyboard nav, typeahead, focus management and theme-aware menu styling — while keeping the exact same external props, so all call sites are unchanged. The "All" option uses an `"__all__"` sentinel mapped to/from `""`. Verified: build, lint, and 7 e2e (incl. the pages that render FilterChip) pass.

## 2026-07-19 15:25 — Replace native selects in the Assets filter with shadcn Select (fourth sweep)

- The Assets "More Filters" popover used two hand-rolled native `<select>` elements (Location, Assigned To). Native option lists are rendered by the OS and ignore the app theme, so in dark mode they showed as white dropdowns with dark text — jarring and off-brand. Replaced both with the shared shadcn `Select` (theme-aware, keyboard-accessible), using an `"all"` sentinel mapped to `""` (Radix forbids empty item values), matching the existing audit-log toolbar pattern. No filter-behaviour change. Verified: build, lint, and e2e (incl. the Assets list) pass.

## 2026-07-19 15:05 — Composite list indexes + stable sort tiebreak (fourth sweep)

- **Stable pagination.** Every list `sortOf(...)` (assets/certificates/applications/people/locations/audit) sorted by a single non-unique column, so rows with an equal sort value (same name, same createdAt, same timestamp) had no defined order — meaning page 2 could repeat or skip rows from page 1. All six now append an `id ASC` tiebreak for a total order.
- **Composite indexes (V017).** List pages always filter `is_archived` then sort by the default column, but V011's single-column `is_archived` indexes can't serve the ORDER BY, forcing a filesort. Added leading-`is_archived` composites (`(is_archived, name)` for assets/certs/apps/locations, `(is_archived, full_name)` + `(is_archived, department)` for people, `(is_archived, created_at)` for assets). Because InnoDB appends the PK to secondary indexes, `(is_archived, name)` also orders by `(name, id)` — matching the new tiebreak. Verified with `EXPLAIN`: the assets list query now uses `idx_assets_archived_name` with `Using index` (covering, no filesort).
- Verified: full `./gradlew build` passes (Testcontainers applies V017 clean); Flyway applied V017 on the running DB; list endpoints respond 200.

## 2026-07-19 14:45 — Ops/production-readiness: health probes, graceful shutdown, pool tuning (fourth sweep)

- Added Spring Boot Actuator with liveness/readiness health groups. The existing `/api/v1/health` was a shallow always-"healthy" check; `/actuator/health/readiness` now actually verifies **database** connectivity (group `readinessState,db`), so an orchestrator won't route traffic to an instance that can't reach MySQL. Only `health` is exposed and only as UP/DOWN (`show-details: never`), so the probe paths are safe to leave unauthenticated (permitted in `SecurityConfig`; skipped by the rate-limit filter).
- `server.shutdown: graceful` + `spring.lifecycle.timeout-per-shutdown-phase: 20s` so in-flight requests finish on SIGTERM instead of being dropped.
- Explicit Hikari pool config (name, size via `DB_POOL_MAX`/`DB_POOL_MIN_IDLE`, 30s connection timeout, 30m `max-lifetime` to recycle before MySQL's `wait_timeout`).
- Verified: full `./gradlew test` passes; health/liveness/readiness return UP (200) unauthenticated, `/actuator/env` is not accessible (401), login + reads unaffected. New `docs/deployment.md` section.

## 2026-07-19 14:25 — Correctness cluster: CSV status, number locale, history cap, read-only tx (fourth sweep)

- **CSV export status.** Certificate and application/licence exports wrote the *stored* status field, so a record stored "Active" but past its expiry exported as "Active" while every list/detail view (which use `computeStatus`) showed "Expired". Both exports now use `computeStatus(status, expiryDate)`, matching the UI. (Assets have no date-derived status, so their export is unchanged.) New regression test.
- **Number-format locale.** Eight money `String.format("%.2f", …)` sites (asset/application exports + sold-price/audit values) omitted a `Locale`, so under a comma-decimal JVM default locale they emitted `1234,56` and corrupted CSV numeric columns. All now pass `Locale.ROOT`.
- **Unbounded asset history.** `GET /assets/{id}/history` with no `limit` loaded the entire timeline (each with its `changes` collection) into memory. It now always pages, defaulting to 500 and clamping any explicit limit to 1000.
- **Read-only transactions.** `DashboardController` and `ReportsController` (both purely read) are now `@Transactional(readOnly = true)`, so each request's aggregate/JOIN-FETCH queries run in one read-only transaction (open-in-view is disabled).
- Verified: full `./gradlew test` passes; API rebuilt + restarted; dashboard, reports, and all three exports respond 200.

## 2026-07-19 14:00 — Chart dark-mode tooltip fix + honest single-series bars (fourth sweep)

- Every dashboard chart duplicated a tooltip style that set a card background but no text colour, so Recharts rendered its default near-black text — unreadable on the dark-theme card. Consolidated into a single `chartTooltipStyle` in `chart-colors.ts` with `color: var(--color-card-foreground)` and applied it across all five charts (age/location/type/value bars + status donut).
- The four single-series bar charts (assets by age/location/type, value by location) painted each bar a different `CHART_PALETTE` colour, implying a per-bar distinction that doesn't exist — the category is already on the axis. They now use one on-brand `CHART_SERIES` colour so bars differ by length, not hue. `CHART_PALETTE` is retained (documented) for genuinely categorical/multi-series use. Verified: build, 40 unit tests, lint, and 7 e2e all pass.

## 2026-07-19 13:30 — Wire up personal alert rules (fourth sweep)

- Users can create per-user alert rules (`UserAlertRulesController` + the "My Alerts" settings tab), but `AlertProcessingService.processPersonalAlerts()` was never invoked — neither the scheduler nor the manual `send-now` trigger called it — so personal rules silently never fired. The scheduler now runs it on the same schedule as the global digest (in its own try/catch so one can't skip the other), and `POST /alerts/send-now` runs it too (best-effort). Made `processPersonalAlerts()` `@Transactional` so its dedup/notification writes commit atomically, matching `processAlerts()`. Verified with a new integration test: an active certificate rule with a 30-day threshold now produces a `personal` notification for its owner.

## 2026-07-19 13:05 — Upgrade Spring Boot 3.2.5 (EOL) → 3.3.7 (fourth sweep)

- Spring Boot 3.2.x is end-of-life (no more security patches). Upgraded to 3.3.7, bumped `io.spring.dependency-management` 1.1.4 → 1.1.6 and `springdoc-openapi` 2.4.0 → 2.6.0 (the 2.4 line is pinned to Boot 3.2). Kotlin stays 1.9.23 (fully supported on 3.3).
- One source change for the Spring Data 3.3 API: `Specification.toPredicate`'s `CriteriaQuery` argument is now nullable, so `FetchSpecs.withFetch` reads `query?.resultType` and contributes no fetch join when the query is absent (non-SELECT paths) — behaviour unchanged for the data/count queries it targets.
- Verified: full `./gradlew build` (unit + Testcontainers integration suite) passes; API boots on 3.3.7 with Flyway validating the schema; login, authed reads (assets/me/notifications/reports), Swagger UI + `/v3/api-docs` (springdoc 2.6), and SSO config all respond 200.

## 2026-07-19 12:35 — Clear dependency vulnerabilities + gate CI audit (fourth sweep)

- `npm audit` reported 16 vulnerabilities (1 critical, 7 high). `npm audit fix` patched the runtime-facing chain (react-router/react-router-dom → 7.18.1, rollup, minimatch, picomatch, flatted) without breaking changes; bumping the dev/test chain (vitest 2 → 4, which pulls vite 7) cleared the rest. Now **0 vulnerabilities**. Verified: 38 unit tests, 7 e2e, build, and lint all pass on vitest 4 / vite 7.
- CI: replaced the non-blocking `npm audit --audit-level=high || true` with a **blocking** audit of shipped deps (`npm audit --omit=dev --audit-level=high`) plus a non-blocking full-tree audit for visibility, so a high/critical vuln in a dependency that reaches users now fails the build while a transitive dev-only advisory doesn't derail unrelated PRs. Added least-privilege `permissions: contents: read` to the workflow.

## 2026-07-19 12:10 — Production SPA serving + security headers on the app document (fourth sweep)

- The app document (the HTML the browser loads first) got no security headers: the API sets CSP/HSTS/frame-deny/etc. but only on `/api/**` responses, and the dev server sets none. Added a production serving path — `apps/web/nginx.conf` (+ multi-stage `Dockerfile`, `.dockerignore`) — that serves the built `dist/` with the full header suite (CSP, nosniff, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, HSTS) and proxies `/api`,`/saml2`,`/login/saml2`,`/scim` on the same origin so the CSP can keep `connect-src 'self'`. CSP is tuned to the real bundle (own JS, inline styles for React/Tailwind, Google Fonts, `blob:`/`data:` images). Mirrored the policy onto `vite preview` in `vite.config.ts`; dev server gets the non-CSP headers only (CSP would break HMR). Verified: all 7 e2e tests pass in a real browser against the CSP-enabled preview build (image picker, form dialogs, bulk selection). New `docs/deployment.md`.

## 2026-07-19 11:35 — Gate domain reads to explicit roles (fourth sweep)

- Every read/export GET on the 12 domain controllers was `@PreAuthorize("isAuthenticated()")`, overriding the class-level Admin/Operator gate — so authorization for reads was "any authenticated principal" rather than the intended role set. Changed all of them to `hasAnyRole('Admin','Operator','User')` (the seeded read-only `User` role is the SSO/SCIM default), so a principal with no recognised role is now denied (least privilege) while the read-only role still works. Writes remain Admin/Operator. Verified: admin reads 200, User-role reads 200 (incl. export) + write 403, and a new integration test locks it in.

## 2026-07-19 10:55 — Fix login-lockout header-spoof bypass (fourth sweep)

- The login brute-force lockout keyed on `X-Forwarded-For` unconditionally, so an attacker could rotate the header per request to get a fresh key and never trip the 5-attempt/15-min lockout. Extracted a shared, proxy-gated `ClientIpResolver` (honours XFF only when `security.trust-forwarded-for=true`, else uses the socket peer) now used by both `AuthController` login and `RateLimitFilter`. Verified: 6 bad logins with rotating XFF now lock at attempt 6 (429).

## 2026-07-19 10:30 — Fix two date bugs: asset-lifecycle 500 + notification-bell miscount (fourth sweep)

- **Reports `/asset-lifecycle`** 500'd whenever only `to`/`from` bounded one side, because the open bound used `LocalDate.MIN` (year -999,999,999) against a MySQL `DATE` column (floor 1000-01-01). Use `LocalDate.ofEpochDay(0)`. Verified: `?to=2026-12-31` now 200.
- **Notification bell** (`NotificationsController`) was missed by the V016 date-only migration: it compared `LocalDate` expiry columns against an `Instant` `now`, dropping items expiring *today*. Now uses `today()`/`today().plusDays(n)` and `LocalDate` paths, matching the rest of the app. Full backend suite green.

## 2026-07-05 23:45 — Adopt useListPage on remaining list pages (third-sweep tail)

- Migrated the five secondary list pages (asset-types, certificate-types, application-types, locations, audit-log) onto the shared `useListPage` hook, matching the four primary pages — removing the duplicated URL-param plumbing (search debounce, sorting memo, page/sort/pageSize handlers, row selection) from each. Added a `defaultPageSize` option to the hook so audit-log keeps its 50-row default. Pure plumbing extraction — query keys, saved views, filters, and default sorts (incl. audit-log's timestamp-desc) preserved. Build + lint + 38 unit + 7 e2e green.

## 2026-07-05 23:20 — Leak/race & a11y polish (third-sweep tail)

- **`useAssetModelImage`**: added a cancellation guard so a superseded/unmounted fetch can't `setState` late or leak an object URL, and de-dupes concurrent object URLs for the same key (revokes the extra).
- **Attachments preview**: revoke the preview blob URL on unmount (not only on dialog close).
- **Offboard person search**: debounced (250ms) so it no longer fires an API call on every keystroke (also avoids out-of-order results).
- **Accessibility**: added `aria-label`s to the attachment Preview/Download/Delete icon buttons.

## 2026-07-05 23:00 — Frontend polish tail (third-sweep)

- **Report date pickers**: `todayISO`/`addDays` used `toISOString()` (UTC), so the Next-30/90 presets and default ranges could be a day off in positive-offset timezones. Added a shared `toLocalISODate` helper and switched the date-range-picker + expiries/licence-summary reports to it.
- **Deactivate & renew dialogs**: default dates (deactivated-on, +1-year renewal, min-date) now use local-calendar dates instead of UTC.
- **Model image**: `<img>` now has an `onError` fallback to the type icon (a stale/expired blob URL no longer shows a broken image).
- **Checkout dialog**: removed dead `personName` state that was always undefined.

## 2026-07-05 22:40 — Backend polish (third-sweep tail)

- **Profile validation**: `UpdateProfileRequest`/`ChangePasswordRequest` gained bean-validation constraints (`@NotBlank`/`@Email`/`@Size`) and the endpoints now use `@Valid` — a malformed email is rejected with 400 (verified) instead of being silently accepted.
- **SCIM createUser**: distinguishes a duplicate (409) from malformed input (400) instead of mapping every failure to 409.
- **Custom-field cascade**: `Asset`/`AssetTemplate` `customFieldValues` `@OneToMany` now `orphanRemoval = true`, so removing an element deletes the row rather than issuing a NOT-NULL-violating `UPDATE ... SET entity_id = NULL`.

## 2026-07-05 22:15 — Frontend UX polish (third-sweep)

- **Reports**: the six report components returned `null` (blank page) when the query errored/returned nothing — now show an "Unable to load report data" message.
- **Number inputs**: clearing the SMTP port / default-page-size fields set the value to `NaN` (React warning + bad payload); now maps `NaN` to `undefined`.
- **Password**: the profile change-password placeholder said "Min. 8 characters" while the schema enforces 6 — aligned to 6.

## 2026-07-05 21:55 — Frontend polish batch (third-sweep)

- **Global search**: `CommandDialog` left cmdk's client-side `shouldFilter` on, so results matched server-side on serial numbers/subtitles (fields not in the item's `value` string) were silently hidden. Now threads `shouldFilter={false}` (results are already server-filtered), and moves the sr-only `DialogTitle` inside `DialogContent` so the dialog has an accessible name.
- **Multi-select custom field**: guard `JSON.parse` result with `Array.isArray` so a non-array stored value can't throw at render.
- **Person history**: the dialog's history query now runs only when the dialog is open (`enabled: open`) instead of on detail-page load.
- **Recent activity**: fixed "1 mins ago" / "1 hours ago" pluralization.

## 2026-07-05 21:35 — Infra, CI & test hardening (third-sweep)

- **Tests**: added a Testcontainers integration test for the two behaviours CLAUDE.md mandates but that were untested — a non-admin (Operator) is forbidden (403) from admin-only endpoints, and a stale `entityVersion` update is rejected (409).
- **CI** (`ci.yml`): added `concurrency` (cancel superseded runs), per-job `timeout-minutes`, and a non-blocking `npm audit --audit-level=high` step.
- **Config drift**: `apps/web/.env.example` API port `5062` → `5115`; pinned MailHog to `v1.0.1`; aligned the Testcontainers MySQL image with dev (`8.0` → `8.3`).
- **Repo hygiene**: removed the two committed Playwright screenshots + the ad-hoc `page.screenshot` calls that regenerated them; `.gitignore` now excludes `saml/*.pem` and `e2e/screenshots/`.
- **Docs**: CLAUDE.md "Tests: <none yet>" replaced with the real backend/frontend/e2e commands. Full test suite green.

## 2026-07-05 21:10 — Fix: timezone off-by-one in expiry logic (third-sweep)

- Date-only values (`YYYY-MM-DD`) were compared with `new Date(iso)` (UTC midnight) against a local `now`, so expiry highlighting/urgency could be off by a day near midnight in non-UTC timezones. Added timezone-safe `daysUntilDate` / `isExpired` / `isExpiringSoon` to `lib/format` (built on the existing local-calendar parser) with unit tests, and replaced the duplicated per-file logic in asset/certificate/application detail pages, the notifications urgency, and the applications table's expiry urgency. 38 unit tests + 7 e2e green.

## 2026-07-05 20:50 — Backend performance (third-sweep)

- Set `hibernate.default_batch_fetch_size: 100` so a page of rows resolves its to-one relations in a few `IN(...)` batches instead of one query per row (mitigates N+1 on CSV exports and sub-resource lists that don't fetch-join). Full 60-endpoint read sweep still clean, 0 lazy errors.
- `SlackService` `RestTemplate` now has 5s connect / 10s read timeouts — a dead webhook host can no longer hang the alert-scheduler thread and hold the `@Transactional` alert run open indefinitely.
- `AlertProcessingService.createGlobalNotifications` now loads existing notification keys once (`findByEntityIdIn`) and checks membership in memory, instead of an `existsBy` query per (user × item) pair.

## 2026-07-05 20:30 — Frontend correctness batch (third-sweep)

- **Double-submit**: the create/edit `FormDialog` `loading` prop omitted `checkDuplicatesMutation.isPending`, leaving the submit button enabled during the duplicate-check round-trip → a second click created a duplicate. Added it on certificates/applications/people/locations.
- **`getAll` truncation**: entity `getAll` (dropdowns/filters) requested `pageSize:1000` but the backend caps at 100, silently dropping items beyond 100. Now pages through the full set (both `createEntityApi` and `asset-models`).
- **Value-by-location chart**: Y-axis always rendered "k" units, so values < 1000 all showed "£0k". Now only abbreviates at ≥ 1000.
- **Custom-field editor**: `sortOrder` for a new field used `fields.length`, colliding after a mid-list removal. Now derives from `max(existing)+1`.
- **Application detail**: seat-usage bar was hidden when `usedSeats === 0` (truthy check); now shows a 0% bar.
- **Settings**: a non-admin reaching an admin-only tab by URL now falls back to Profile instead of a blank body.
- **Notifications**: clamp the page after mutations reduce the count so the user isn't stranded on an empty page.

## 2026-07-05 20:10 — Backend correctness batch (third-sweep)

- **getHistory `limit<=0` → 500**: `PageRequest.of(0, limit)` threw on non-positive limits (Certificates/Applications/People). Now `coerceIn(1, 500)`. Verified: `?limit=0`/`-5` return 200.
- **Asset update depreciationMonths**: applied `request.depreciationMonths ?: old` so the field could never be cleared and the audit logged a change that wasn't made. Now applies the value directly (consistent with other fields + the change tracking).
- **Asset bulk-status**: rejected terminal statuses (`Retired`/`Sold`/`Archived` need the dedicated flows with dates/assignment cleanup — verified 400) and clears the assignee when moving to `Available` (was leaving a dangling assignee).
- **Applications archive/bulk-archive**: now blocked when active licence seats exist (previously orphaned seat rows + stale `usedSeats`).
- **People update**: rejects an email already used by another active person (create already did).
- **Missing `@Valid`** added to Certificate/Application/Location update endpoints.
- **Last-admin guard** (`UsersController.update`): the last active Admin can't be deactivated or demoted (verified 400) — prevents org-wide admin lockout.
- **SCIM**: `listUsers` now honours `startIndex`/`count` with correct `totalResults`; `createUser` rejects duplicates (externalId/username/email) instead of silently creating a second user.

## 2026-07-05 19:45 — Frontend security hardening (third-sweep)

- **Login SSO redirect**: the open-redirect guard (`startsWith("/") || startsWith(origin)`) allowed protocol-relative `//evil.com`. Now resolves the URL against the current origin and requires it to stay same-origin, rejecting `//` and `\` prefixes.
- **Alert-history CSV export**: neutralise CSV formula injection — cells beginning with `= + - @` (or tab/CR) are prefixed with `'` before quoting (the user-controlled `entityName` could otherwise execute in Excel/Sheets).
- **Asset-model edit-mode image upload**: now validates MIME type (JPG/PNG/GIF) like the create-mode picker, instead of only checking size.
- **Attachment PDF preview**: `<iframe>` for user-uploaded files now `sandbox="allow-same-origin"` (no scripts). Build + lint + 35 unit + 7 e2e green.

## 2026-07-05 19:30 — Backend security hardening (third-sweep)

- **Slack**: SSRF webhook allow-list now requires an exact host (`hooks.slack.com` or a `.slack.com` subdomain) + HTTPS — a suffix check previously matched `evilslack.com`. `orgName` (a user-set setting) is now JSON-escaped in the payload, and `escapeJson` also handles `\r`/`\t`.
- **Login rate limiter**: `recordFailedAttempt` now uses an atomic `compute` (concurrent failed logins could previously lose increments and slip under the lockout threshold); the attempts map is size-bounded with stale-entry pruning.
- **Global rate-limit filter**: `X-Forwarded-For` is only trusted when `security.trust-forwarded-for=true` (behind a real proxy) — otherwise it keys on `remoteAddr`, so the header can't be spoofed/rotated to evade limits; the per-IP map is size-bounded.
- **Attachments**: store/serve the Tika content-detected MIME type instead of the client-declared header, so `Content-Type` matches the actual bytes. Verified: login + rate-limit headers intact after restart; full test suite green.

## 2026-07-05 19:05 — Fix: assignments report double-count + offboard integrity (third-sweep)

- **Reports `/assignments`**: the query `JOIN FETCH`ed `assignedAssets` without `DISTINCT`, so a person with N assets appeared N times and `totalAssigned` was inflated. Added `SELECT DISTINCT`. Verified: a person with 3 assets now appears once with count 3 (no duplicate rows).
- **People `/offboard`**: (1) each action now verifies the asset/certificate/application is actually assigned to the person being offboarded (previously any client-supplied entity id was reassigned/freed — verified fixed: offboarding a non-owner leaves the item untouched); (2) transfers reject archived target people; (3) freeing an asset no longer clobbers terminal states (`Retired`/`Sold`/`InMaintenance`) — only `Assigned`/`CheckedOut` return to `Available`.

## 2026-07-05 18:45 — Fix: Assets bulk actions were unreachable (third-sweep)

- The Assets list wired a `BulkActionBar` + row selection + `getRowId` but its columns never included a selection checkbox (unlike every other list page), so `selectedCount` was always 0 and Edit/Archive/status bulk actions could never be triggered. Prepended `getSelectionColumn<Asset>()` to the columns. Added an e2e test asserting selecting rows reveals the bulk bar.


## 2026-07-05 18:30 — Disable Open Session In View (second-sweep tier 3)

- Set `spring.jpa.open-in-view: false`. OSIV was masking lazy-load access after the transaction and holding DB connections through view render. The Hibernate session is now bound to the transaction; DB connections release earlier and lazy-load mistakes surface instead of being hidden.
- Fixed every read path that relied on OSIV to touch a lazy relation:
  - Auth: login + `/me` now load the user via `findWithRolesByUsername` / `findWithRolesById` (fetch-join); the SAML success handler reloads roles the same way. The `JwtAuthenticationFilter` already fetch-joined roles.
  - `@Transactional(readOnly = true)` on `UsersController` list/getById, the three type controllers' `getAll`/`getById`/`getCustomFields` (read `customFieldDefinitions`), and the four `getHistory` endpoints (read `History.changes`).
- Verified: full read-endpoint sweep of 60 GETs returns 200 with **zero** `LazyInitializationException`; a create→update→archive write round-trip works; backend test suite + frontend Playwright e2e green. No DB migration.

## 2026-07-05 17:40 — Shared FormDialog for panel form dialogs (second-sweep tier 3)

- Added a shared `components/form-dialog.tsx` (`FormDialog`) that owns the "panel" create/edit dialog chrome (full-height dialog, bordered header + description, scrollable body, styled Cancel/submit footer). Migrated the six dialogs that used that chrome onto it: certificate, application, asset, asset-template, asset-model, and the generic type-form-dialog. Each keeps its own react-hook-form instance, schema, reset-on-open effect and fields; only the layout is shared. ~180 lines of duplicated chrome removed.
- Verified end-to-end with Playwright: added `e2e/form-dialogs.spec.ts` (create dialogs on certificates/applications/asset-types/asset-templates render through the shell and close), and the pre-existing asset + asset-model e2e specs still pass. Build + unit tests + lint green.
- Left as-is (documented): the two simple dialogs (location, person) use a smaller, different chrome and aren't part of the panel family; `user-form-dialog` is a genuine outlier (separate create/edit dialogs). Forcing them onto the panel shell would change their appearance without real dedup.

## 2026-07-05 17:05 — Shared useListPage hook for list pages (second-sweep tier 3)

- Extracted the identical URL-param list plumbing shared by the assets/certificates/applications/people pages into a `useListPage` hook: server-side page/pageSize/search/sort state kept in the query string, the debounced-search + URL-sync effects, the `sorting` memo, and the sort/page/pageSize/filter handlers + row-selection state. Each page now calls the hook instead of re-declaring ~50 lines of the same boilerplate. Verbatim extraction — behaviour unchanged; build + tests + lint green.
- Scoping note: deliberately did **not** build a shared `ListPageShell` JSX component. The four pages' render trees diverge substantially (applications has no saved views and a hand-rolled toolbar/density/deactivate flow; assets has custom-field column machinery and no selection column; people lacks status/type/viewMode/bulk-status), so a shell covering all four would need so many slots it would add regression risk to the app's most-used pages for little benefit.

## 2026-07-05 16:40 — CSV import N+1 fix (second-sweep tier 3)

- `ImportController` previously issued a `findXByName` DB query per row per referenced entity (an asset row did 3), in both `validate` and `execute` — an N+1 that scaled with row count. Now each request builds the needed name→entity lookup maps once (`buildLookups`) and resolves references in-memory. A 10k-row asset import drops from up to ~30k lookup queries to 3. Behaviour verified identical via runtime validate+execute (case-insensitive match resolves, unknown names still error). Clean compile + full test suite green.

## 2026-07-05 16:20 — Shared computed-status query predicate (second-sweep tier 2)

- Extracted the duplicated computed-status filter (stored Active → Expired past expiry, or PendingRenewal within 30 days) from `CertificatesController.buildSpec` and `ApplicationsController.buildSpec` into a single generic `computedStatusPredicates(...)` in `util/StatusComputation.kt` — the Criteria-query counterpart of `computeStatus`. Both controllers now call it; ~80 lines of duplication removed. Behaviour verified identical via runtime status filtering (certs Active 5 + Expired 4 + PendingRenewal 1 = 10; apps 4+4+3+raw = 12). Clean compile, full test suite green.
- Scoping note: the plan's "AssetStatsService" aggregate consolidation was intentionally **not** done — the Dashboard vs Reports asset aggregates are different metrics (Dashboard excludes Retired/Sold for current-portfolio value; Reports includes all for all-time value), so folding them would change report output rather than dedup.

## 2026-07-05 16:00 — Shared StatusBadge + centralised formatters (second-sweep tier 2)

- Added a generic `ui/status-badge.tsx` (`StatusBadge`) rendering via shadcn `Badge`; the asset/certificate/application badges are now thin config wrappers over it. This also fixes the asset badge's visual inconsistency (it previously rendered a hand-rolled `<span>` instead of the shared `Badge`).
- Moved `formatCustomFieldValue` (was duplicated in 4 files) and the date-wrapper helpers into `lib/format` as `formatCustomFieldValue`, `formatDateOrNull`, and `formatDateOrDash`; the 5 `OrNull` and 2 `OrDash` local wrappers now import them. Behaviour preserved. Build + 35 tests + lint green.

## 2026-07-05 15:45 — Fold type modules into entity factory (second-sweep tier 2)

- Rewrote the asset-types / certificate-types / application-types API + hook modules on top of the existing `createEntityApi` / `createEntityHooks` factories (matching the pattern already used by assets/certificates/applications). Removed ~180 lines of hand-rolled CRUD duplication. Query keys and invalidation behaviour are byte-for-byte preserved (`related: []`; asset-types keeps its `assets`/`asset-models` cross-invalidation on update); the `bulkArchive` and `getCustomFields` extras stay module-local. Build + tests + lint green.

## 2026-07-05 15:35 — Config, deps & docs cleanup (second-sweep tier 1)

- Removed the unused `next-themes` dependency (no imports anywhere) and a stray empty `apps/api-kt/apps/` directory.
- Fixed doc drift: CLAUDE.md coding standard (`TS + C#` → `TS + Kotlin`); `docs/ux-guidelines.md` DataTable "future features (not yet implemented)" list (all five are implemented — reworded to "it provides"); `lib/format.ts` header comment referencing a non-existent `useFormatters()` hook (now describes the real `setFormatSettings` mechanism). README Swagger URL verified correct — no change.

## 2026-07-05 15:20 — Frontend dead-code cleanup (second-sweep tier 1)

- Removed a fully-dead dashboard data chain (4 unused hooks, 4 API client methods, 4 types) and two unreachable dashboard widget ids (`recentlyAdded`, `unassignedAssets`) that weren't toggleable or default-visible.
- Deleted 4 orphaned components (`applications-toolbar`, `attention-strip`, `ui/tabs`, `ui/breadcrumb`).
- Removed unused hook re-exports (`useAssets`/`useCertificates`/`useApplications`), unused single-item hooks + their now-orphaned `getById` API methods (`useAssetModel`/`useAssetTemplate`), unused `format.ts` helpers (`getActiveCurrency`/`getActiveDateFormat`), the unused `BAR_CHART_COLOR` constant, and the deprecated `onSubmit` path in the asset-model form dialog. No behaviour change; build + 35 tests + lint green.

## 2026-07-05 15:05 — Backend dead-code cleanup (second-sweep tier 1)

- Removed compiler-flagged dead code: 5 unused vars (`now`/`existingCfvs`), 5 unused imports, an unnecessary `!!`, two always-true `authProvider != null` checks (the column is non-null), an unused Specification `query` param, and two unused `AssetModelRepository` query methods. No behaviour change; full test suite green.

## 2026-07-05 14:35 — Fix: certificate export & renew 500 (LocalDate formatted with a time pattern)

- `CertificatesController` was formatting its now-`LocalDate` `issuedDate`/`expiryDate`/`newExpiryDate` with the `yyyy-MM-dd HH:mm:ss` timestamp formatter, throwing `UnsupportedTemporalTypeException: HourOfDay`. This broke the **certificate CSV export** (emitted a header-only, truncated file) and the **certificate renew** endpoint (500). A regression from the date-only migration; Assets/Applications were unaffected (they use a date-only formatter). Fixed by adding a `dateOnlyFormat` for those fields.
- Added `CertificateDateIntegrationTest` covering export + renew for a dated certificate.
- Fixed a test-infra flake: switched `AbstractIntegrationTest` to a **singleton** MySQL container (started once, never stopped) instead of a JUnit `@Container` (which is stopped after the first test class, leaving the reused Spring context pointed at a dead DB — a hang/read-timeout once a second integration class exists).

## 2026-07-05 13:40 — Remove dead disabled buttons (2FA card, Preview Daily Report)

- Removed the non-functional `disabled` "Configure 2FA" card (Profile tab) and "Preview Daily Report" button (Alerts tab), plus their now-unused icon imports. 2FA is an explicit non-goal, and both were dead half-built UI. (The backlog listed this as done under PR #141, but the removal had never actually landed on `main` — this reconciles the code with the todo.)

## 2026-07-04 23:50 — Date-only storage (DATE / LocalDate) + fix truncating daysUntilExpiry

- **DB migration V016**: converts the business date-only columns from `DATETIME` to `DATE` — `assets`(purchase/warranty/sold/retired), `certificates`(issued/expiry), `applications`(purchase/expiry/deactivated), `alert_history`(expiry), `user_notifications`(expiry). True timestamps (created/updated, audit/history, token_invalidated_at) stay `DATETIME`. Existing values truncate to their date part (no day shift); indexes preserved.
- Backend: those entity fields + their DTOs are now `LocalDate`; filtering, status computation (`computeStatus`), CSV export/import and audit change-tracking all use date-only comparisons. A new `FlexibleLocalDateDeserializer` accepts both `2026-02-20` and legacy `2026-02-20T00:00:00Z` payloads.
- **Fixed the truncating `daysUntilExpiry`**: replaced ~12 `ChronoUnit.DAYS.between(Instant.now(), expiry)` sites (dashboard, alerts, reports, search) with a date-only `daysUntil(...)`, so counts are exact whole calendar days and timezone-stable (previously off-by-one / would even throw once the column became `LocalDate`).
- Frontend: `lib/format.ts` now parses bare `YYYY-MM-DD` as a *local* calendar date (no UTC-midnight day shift); date-picker submits send bare dates instead of appending `T00:00:00Z`.
- Verified end-to-end against the running stack (migration applied, `ddl-validate` passes, no day-shift on existing data, create/update in both formats, inclusive/exclusive expiry filtering, all dashboard/report endpoints, exact daysUntilExpiry) and via the Testcontainers suite (Flyway V016 from clean).

## 2026-07-04 23:10 — Testcontainers integration tests + more frontend unit tests

- Added a MySQL-Testcontainers integration suite (`api-kt/.../integration`): boots the full Spring context against a throwaway MySQL container, so **Flyway migrates from clean** and `ddl-auto=validate` runs against a real schema every test run. Covers the **auth flow** (login returns a token, protected endpoints reject unauthenticated requests, bad credentials → 401), **token invalidation** (a token issued before `tokenInvalidatedAt` is rejected), and **audit emission** (a write produces a `Created`/`Location` audit row). 5 tests.
- Added Testcontainers deps (pinned via BOM 1.20.4) and a CI-safe, local-only `api.version` escape hatch in the test task (only applied when `DOCKER_API_VERSION` is set — needed on Docker Desktop, whose MinAPIVersion rejects docker-java's default negotiation; unset in CI).
- Frontend: added 11 unit tests (asset/location zod schema validation, chart-colour palette) — 35 total.

## 2026-07-04 22:50 — Fix N+1 on paged list endpoints (fetch-joins)

- The Assets/Certificates/Applications/People paged list endpoints fired one extra SELECT per row for each denormalised name read off a LAZY `@ManyToOne` (assetType/location/assignedPerson/assetModel, certificateType/asset/person/location, etc.).
- Added a shared, count-safe `withFetch(...)` Specification (`util/FetchSpecs.kt`) that LEFT JOIN FETCHes the to-one relations only on the data query (skips the `resultType == Long` paging count query), composed into each list spec. All fetched relations are to-one, so pagination stays a real SQL `LIMIT` (no in-memory paging).
- Also fetch-joined `CustomFieldValue.customFieldDefinition` on the batch value loaders (`findByEntityId`/`findByEntityIdIn`) to remove the secondary per-value N+1.
- Verified with SQL logging: a 25-row assets list dropped from ~100+ queries to a constant **5** (constant across page sizes); denormalised names, `totalCount` and pagination all still correct. No DB or API-shape change.

## 2026-07-04 22:35 — CustomFieldValueService (unify 4× value upsert)

- New `CustomFieldValueService.upsert(...)` replaces the four hand-rolled custom-field *value* upserts in Assets, Certificates, Applications and AssetTemplates controllers (create + update = 8 sites).
- Per-site differences are preserved via callbacks: `onInvalid` (Assets/Applications *create* throw `400`; others skip) and a `track` change-reporter (Assets/Applications *update* record `Custom: <field>` audit changes, with each keeping its own empty/blank rule). Invalid-def-on-create now rolls back atomically (same `400` body) instead of persisting a partial record.
- Completes the item-5 refactor (paired with the earlier ArchivableTypeCrud + CustomFieldDefinitionService PR). No DB or API-shape change.

## 2026-07-04 22:20 — Shared type-CRUD helper + CustomFieldDefinitionService

- Extracted the near-identical Asset/Certificate/Application **type** controllers' shared logic into `ArchivableTypeCrud<E>` (paged search list, get-by-id, custom-field listing, in-use-guarded archive, bulk archive). Each controller keeps its thin request-mapped endpoints (correctly proxied) that delegate to the helper, plus its own create/update.
- New `CustomFieldDefinitionService` centralises the custom-field *definition* create + update-diff (archive-removed / update-matched / add-new) previously duplicated across the 3 controllers; invalid field types now throw `400` atomically (rolling back rather than leaving a partial type).
- Added a shared `ArchivableType` interface (implemented by the 3 type entities) and an `ArchivableTypeRepository<E>` base repository. No DB or API-shape change (verified all endpoints, custom-field create/update/delete, in-use 409 guard, and invalid-type 400 against the running stack).
- Note: the separate 4× `CustomFieldValue` upsert duplication (assets/certificates/applications/asset-templates) is a follow-up PR.

## 2026-07-04 22:00 — createEntityApi / createEntityHooks factories

- Added `lib/api/create-entity-api.ts` (`createEntityApi`) and `hooks/create-entity-hooks.ts` (`createEntityHooks`) to remove the ~90%-identical CRUD boilerplate across the 5 entity modules (assets, certificates, applications, locations, people).
- Cross-entity cache invalidation is now **declarative** via an `EntityInvalidation` config (`historyOnUpdate`, `crossEntityOnUpdate`) consumed by a pure, unit-tested `entityWriteInvalidations` function — behaviour is identical to the previous hand-written `onSuccess` blocks (e.g. a location rename still refreshes assets/certificates/applications/people; a person update refreshes assets/certificates/applications).
- Entity-specific endpoints (checkout/checkin/retire/sell, renew, seat assignment, offboarding, reassign-and-archive, history, duplicates, bulk-status) remain hand-written; action hooks reuse the shared invalidation helper.
- Added `create-entity-hooks.test.ts` (invalidation matrix). Net ~220 fewer lines. No API/DB change.

## 2026-07-04 21:40 — Shared CsvExport helper + export row cap (OOM guard)

- New `util/CsvExport.kt` unifies both CSV export mechanisms: `stream(...)` for the entity list exports and `toResponseEntity(...)` for the bounded report/import exports. Consistent `text/csv` + UTF-8 + `Content-Disposition` wiring and formula-injection sanitisation in one place.
- Entity exports (assets, certificates, applications, locations, people, audit-logs) now bound their fetch with `PageRequest.of(0, MAX_ROWS + 1, sort)` and cap output at 100,000 rows, appending a visible truncation notice + logging a warning when exceeded — guarding against OOM on large/unfiltered exports (previously `findAll(spec)` loaded the entire table into memory).
- ReportsController and the import-template download now delegate to the shared helper (removes duplicated `ByteArrayOutputStream`/`CSVWriter` wiring).
- Added `CsvExportTest` (cap, truncation notice, sanitisation, headers). No DB or API-shape changes; export responses are unchanged for normal-sized data.

## 2026-07-04 21:25 — Generic type-management components (dedup)

- Replaced the triplicated Asset/Certificate/Application type-management components with shared generics under `apps/web/src/components/type-management/`: `TypeFormDialog`, `TypesToolbar`, `getTypeColumns`, plus the relocated `CustomFieldEditor` and a shared `mapCustomFieldsToForm` helper.
- The generic `TypeFormDialog` owns the dialog chrome, Name/Description fields, custom-field editor and reset-on-open; entity-specific fields (asset's `defaultDepreciationMonths` + `nameTemplate`) are supplied via render-prop slots.
- Deleted 10 near-identical per-entity component files; the three type pages now configure the generics. Net ~400 fewer lines. No behaviour, DB or API changes.

## 2026-07-04 20:55 — Apply org dateFormat & currency settings app-wide

- The System Settings `dateFormat` and `currency` values were configurable but ignored everywhere; they now drive all date and money rendering.
- New shared, settings-aware formatting helpers in `apps/web/src/lib/format.ts` (`formatDate`, `formatDateTime`, `formatCurrency`, `getCurrencySymbol`, `formatCompactCurrency`), replacing ~40 hardcoded `en-GB`/`GBP`/`£` call sites across pages, columns, cards, reports, charts and form dialogs.
- Settings are loaded once into a module-level store via `useFormatSettingsSync()` (mounted in the app shell); saving System Settings applies the change and invalidates queries so the whole app reformats immediately.
- Currency field in System Settings changed from free-text to a Select of valid ISO 4217 codes (an invalid code previously threw a `RangeError` in `Intl.NumberFormat`); label corrected from "Currency Symbol" to "Currency".
- Added unit tests for the new formatters. No DB or API changes.
- Note: date-only fields are still parsed in local time (unchanged behaviour); the timezone/date-only storage hazard is tracked separately.

## 2026-03-02 10:00 — Asset Models feature

- Added new **Asset Models** entity for product-level identity (e.g., "MacBook Pro 14" M3 Max")
- Each model belongs to an asset type and has: name, manufacturer, product image
- New `/api/v1/asset-models` endpoints: CRUD + image upload/delete/serve
- **Conditional model requirement**: if an asset type has models defined, selecting a model is required when creating/editing assets of that type
- New Asset Models management page at `/asset-models` with image upload support
- Model selector dropdown in asset create/edit form (appears when models exist for selected type)
- Model product images display in asset list table and asset detail page header
- DB migration: V012 creates `asset_models` table and adds `asset_model_id` FK to `assets`

## 2026-02-25 15:40 — Add asset restore endpoint

- Added `POST /api/v1/assets/{id}/restore` to un-archive soft-deleted assets
- Sets `isArchived = false`, logs "Restored" audit entry
- Returns 400 if asset is not archived, 404 if not found
- Frontend already has "Restored" labels in history timelines and audit log

## 2026-02-25 14:23 — Fix theme toggle (dark/light/system)

- Theme radio buttons in Settings > Profile now apply immediately on selection (not just on save)
- Fixed `syncTheme()` in auth context to apply dark class to document — was only saving to localStorage without toggling the CSS class
- Theme now correctly applies on login, SSO token callback, and profile update

## 2026-02-25 14:15 — Code review round 4 (part 2)

### Backend (Kotlin/Spring Boot)
- Removed ambiguous `MM/dd/yyyy` date format from ImportController — UK `dd/MM/yyyy` is the standard

### Frontend (React)
- Fixed "Next Scheduled Scan" in alerts summary — now computes actual next run time from scheduleType, scheduleTime, and scheduleDay (was hardcoded "Tomorrow 08:00")
- Wired "Export Logs" button in alerts tab — downloads current alert history page as CSV

## 2026-02-25 10:30 — Code review round 4

### Backend (Kotlin/Spring Boot)
- Fixed LIKE escape char missing from 3 `cb.like()` calls in AuditLogsController search
- Added date validation try-catch in AssetsController (5 date params), CertificatesController (2), ApplicationsController (2), ReportsController parseDateRange — now returns 400 instead of 500 on malformed dates
- Added `@Transactional` to UsersController create/update (atomic user+role saves)
- Added `@Transactional` to SettingsController updateSystem/updateAlerts (atomic multi-setting saves)
- Added `@Transactional(readOnly = true)` to 6 export endpoints (Assets, Certificates, Applications, People, Locations, AuditLogs) — prevents LazyInitializationException if OSIV disabled
- Fixed UsersController SSO check: `authProvider != "LOCAL"` → `authProvider != null && authProvider != "LOCAL"` (null authProvider was treated as SSO)
- Fixed AlertsController redundant double-sort: removed method-name sort, kept Pageable sort
- Fixed AssetsController bulkEdit N+1: replaced per-asset `findById` loop with batch `findAllById`

### Frontend (React)
- Fixed command search: location results now navigate to `/locations/:id` detail page instead of `/locations` list
- Removed dead "quickFilter" key from certificates clearAllFilters

## 2026-02-25 09:33 — Code review round 3 (part 2)

### Backend (Kotlin/Spring Boot)
- Fixed webhook URL masking detection in SettingsController: replaced fragile `endsWith("...")` check with comparison against `maskWebhookUrl(currentValue)` — prevents silently ignoring URLs that legitimately end in `...`
- Simplified UsersController filter: removed redundant `!isAdmin()` check (endpoint already requires Admin role via `@PreAuthorize`)

## 2026-02-25 09:29 — Code review round 3

### Backend (Kotlin/Spring Boot)
- Fixed LIKE escape character missing from all 6 `cb.like()` calls in SearchController (escape pattern was applied but escape char `'\\'` was not passed to JPA, making escaping ineffective)
- Added null safety to `queryTotalAssets()` in ReportsController (`singleResult ?: 0L`)

### Frontend (React)
- Added `type="button"` to 8 `<button>` elements across data-table-pagination, notifications-bell, and expiring-items-table (prevents unintended form submissions)
- Added `aria-label="User actions"` to icon-only dropdown trigger in users-tab

## 2026-02-24 21:59 — Code review round 2

### Backend (Kotlin/Spring Boot)
- Added `@PreAuthorize("hasAnyRole('Admin','Operator')")` to DashboardController (was unauthenticated)
- Wrapped date parsing in AuditLogsController with try-catch (returns 400 on invalid dates)
- Enforced search limit max 50 in PeopleController (`limit.coerceIn(1, 50)`)
- Added `@Modifying` to repository delete methods (deleteByUserIdAndRoleId, deleteByEntityId)
- Added `@Valid` to request bodies in AssetsController and PeopleController
- Replaced 14 unsafe `.get()` calls with `.orElseThrow` across 6 controllers

### Frontend (React)
- Fixed missing publisher filter in applications CSV export
- Added validation to BulkEditDialog (toast error when checkbox checked but no value selected)
- Fixed unsafe `as string` type casts in application-form-dialog (replaced with `?? ""`)
- Increased global React Query staleTime from 30s to 5 minutes

## 2026-02-24 21:51 — Comprehensive code review fixes

### Backend (Kotlin/Spring Boot)
- Fixed `trackDecimal` null comparison bug in AssetsController and ApplicationsController (phantom audit log entries)
- Fixed LIKE injection in AuditLogsController search (added SqlUtils.escapeLikePattern)
- Added SSO user guard for password change in ProfileController (prevents NPE)
- Added missing `authProvider` field to ProfileController updateProfile response
- AlertsController: replaced manual auth checks with `@PreAuthorize`, fixed 0-based pagination to 1-based, used `PagedResponse`
- Added `@Transactional` to AssetTemplatesController create/update and SavedViewsController setDefault
- Added `@Transactional(readOnly = true)` to SearchController search
- Added `DataIntegrityViolationException` handler to GlobalExceptionHandler (409 response)
- DatabaseSeeder: injected `PasswordEncoder` bean instead of creating standalone `BCryptPasswordEncoder`
- New V011 migration: performance indexes on status, expiry_date, is_archived columns

### Frontend (React)
- Fixed `hasAnyFilter` bug in audit-logs-toolbar (Clear Filters button always showing)
- Fixed conditional dialog descriptions for certificate and application form dialogs
- Fixed currency symbol from $ to £ in application, asset, and asset-template form dialogs
- Fixed breadcrumb hrefs: certificate-types → /certificates, application-types → /applications
- Lifted mutation hooks from NotificationCard to NotificationList (prevents N hook instances)

## 2026-02-24 21:35 — Notifications page redesign

- Replaced tab-based notification list with individual cards featuring urgency icons and category labels
- Urgency system: Expired (red), Urgent (red), Warning (amber), Upcoming (blue), Info (primary) based on days to expiry
- 3-dot action menu on each card for mark-as-read, dismiss, and snooze (1d/3d/1w)
- Underline-style tabs for Current vs History views
- Entity names link to detail pages (assets, certificates, applications)

## 2026-02-24 21:11 — Audit log redesign

- Redesigned audit log table: two-line timestamps, actor initials avatars, color-coded uppercase action badges, entity links for all types
- Replaced text search filter with multi-select checkbox dropdown for activity types (supports selecting multiple actions)
- Backend: action filter now supports comma-separated values for multi-select
- Switched filters to consistent shadcn Button/Popover/Select components
- Default page size increased from 25 to 50
- Export and Saved Views moved to page header actions

## 2026-02-24 20:46 — UI consistency audit across all pages

- Breadcrumb group labels now match sidebar names ("Inventory" → "Assets", removed "Tools" prefix from Audit Log)
- Added missing breadcrumbs to Asset Templates, Notifications pages
- Replaced raw `<h1>` with PageHeader component on Reports, Settings, Import pages
- Fixed person-detail title size (text-3xl → text-2xl) to match other detail pages
- Fixed Reports page spacing (space-y-8 → space-y-6) to match all other list pages

## 2026-02-24 20:33 — Breadcrumbs above title on all detail pages

- Moved breadcrumbs from below the title to above it on all 5 detail pages (assets, certificates, applications, locations, people)
- Consistent `mb-4` spacing between breadcrumbs and title across all detail pages

## 2026-02-24 20:25 — Computed PendingRenewal / Expired status

- Applications and Certificates with stored status `Active` now automatically compute to `Expired` (if expiryDate is in the past) or `PendingRenewal` (if expiryDate is within 30 days) in API responses
- Dashboard summary counts (application-summary, certificate-summary) reflect computed statuses
- List filtering by `PendingRenewal`, `Expired`, or `Active` includes/excludes computed matches
- No DB schema changes — computation is read-only on the DTO layer

## 2026-02-24 20:15 — Block delete of assigned applications

- Block: cannot delete an application that is assigned to someone (returns 400 with clear error message)
- Block: bulk-archive skips applications that are assigned to someone
- UI: delete error toast now shows actual API error message instead of generic fallback

## 2026-02-24 19:58 — Block checkout/reassignment of assigned assets + show API error messages

- Block: cannot check out an asset that already has someone assigned (checks `assignedPersonId`, not just status)
- Block: cannot reassign an asset to a different person via edit — must unassign first
- Block: cannot set status to CheckedOut via edit form when someone is assigned
- UI: Check Out button only appears for Available assets (removed from Assigned)
- UI: Edit form status dropdown limited to Available, Assigned, In Maintenance (Retired/Sold/CheckedOut have dedicated buttons)
- UI: All asset detail error toasts now show the actual API error message instead of generic fallback
- Backend: bulk status change skips assigned assets when target is CheckedOut

## 2026-02-24 14:30 — Fix asset form dirty tracking, required custom fields, dashboard widget

- Fix: "Save Changes" button now disabled until a field is actually changed (assets, certificates, applications)
- Fix: `setValue` calls for Assigned To and Status now pass `shouldDirty: true` so form tracks changes from combobox/select
- Fix: PersonCombobox display updates to show newly selected person instead of stale original name
- Fix: Required custom fields (marked with `*`) now validated on submit — blank values show error message
- Fix: Dashboard "In Maintenance" widget renamed to "In Repair", link corrected to valid `InMaintenance` enum

## 2026-02-24 14:09 — Dead code cleanup: 1,302 lines removed

### Frontend — 11 orphaned files deleted
- `quick-actions.tsx` (433 lines), `import-tab.tsx` (382 lines), `password-form.tsx` (123 lines) — replaced by other components
- `date-range-filter.tsx`, `numeric-range-filter.tsx`, `quick-filter-bar.tsx` — never imported
- `theme-toggle.tsx`, `collapsible.tsx`, `certificates.tsx.tmp` — unused/replaced
- `use-notifications.ts`, `lib/api/notifications.ts` — replaced by use-user-notifications.ts

### Backend — Unused repository interfaces + methods removed
- Removed 6 unused repository interfaces: `PermissionRepository`, `RolePermissionRepository`, `AssetHistoryChangeRepository`, `CertificateHistoryChangeRepository`, `ApplicationHistoryChangeRepository`, `PersonHistoryChangeRepository`
- Removed 5 unused repository methods: `RoleRepository.existsByName`, `countByIsArchivedFalse` (3 repos), `SavedViewRepository.findByUserId` (single-param)
- Removed unused `Tuple` import from DashboardController
- Removed unused `val parsed` variables from ApplicationsController + AssetsController

## 2026-02-24 08:20 — Comprehensive bug sweep: 35 fixes across frontend + backend

### Backend — Error handling
- Global exception handler: malformed JSON, unknown fields, missing body/params now return 400 (not 500)
- Unauthenticated requests now return 401 (not 403)
- Optimistic locking conflicts return 409 with clear message
- All error responses now consistently return `{"error": "..."}` JSON format

### Backend — Data integrity
- Added `@Version` optimistic locking to Asset, Certificate, Application, Person, Location (+ migration V010)
- Added `@NotBlank` validation on name/fullName for Locations, People, Certificates, Applications
- Certificate date validation: expiryDate must be after issuedDate
- People duplicate email check (409 on conflict)
- Asset update preserves `depreciationMonths` when not provided (was being wiped to null)
- Custom field values cleaned up when asset type changes or custom field definition is archived
- Import controller: replaced all `!!` NPE risks with safe null handling + status alias mapping

### Backend — Performance + audit
- Bulk operations now use batch `findAllById`/`saveAll` instead of individual fetch/save
- LIKE search patterns now escape `%` and `_` wildcards across all controllers
- `@Transactional` added to AssetTypes, CertificateTypes, ApplicationTypes write methods
- `reassignAndArchive` now logs individual audit entries for each moved entity
- Date filter off-by-one fixed (was missing last millisecond of day)

### Frontend — React Query
- All mutations now invalidate `["dashboard"]` queries on success
- `useUpdateLocation` and `useUpdatePerson` now invalidate detail queries
- `useOffboardPerson` and `useReassignAndArchiveLocation` invalidate related entity queries
- All `usePerson*` hooks now have `enabled: !!id` guard

### Frontend — Forms + UX
- Certificate schema: cross-field validation (expiry must be after issued date)
- Application schema: cross-field validation (usedSeats cannot exceed maxSeats)
- Added React ErrorBoundary wrapping the entire app (prevents white-screen crashes)
- FilterChip dropdown: added ARIA roles, keyboard navigation, Escape-to-close
- Asset create: double-submit protection includes duplicate check pending state

## 2026-02-24 07:50 — Bug sweep: frontend + backend fixes

### Frontend
- Fix impure `Date.now()` call during render in dashboard (wrapped in useMemo)
- Fix clone asset `purchaseDate` falling through to `""` instead of `null`
- Add catch-all 404 route for unknown URLs
- Remove unused eslint-disable directive in assets/columns.tsx

### Backend
- Add `@Transactional` to 32 write methods across 7 controllers (data integrity)
- Fix AuditService silently dropping Deactivated/Reactivated/StatusChanged app history events
- Fix inconsistent password validation (ProfileController was 6 chars, now 8 to match UsersController)
- Add field change tracking to location updates in audit log
- Certificate status now returns 400 on invalid input instead of silently defaulting to Active

## 2026-02-22 15:42 — Alert rule modal redesign

- Restyled create/edit alert rule dialog to match new design system
- Larger spacing, bg-muted/50 inputs, email toggle in card-like row, footer with muted background

## 2026-02-21 18:13 — My Alerts, Users, and System tabs redesign

- My Alerts: card-based layout with Bell icon header, alert rules in bg-muted/50 styled rows
- Users: card with Users icon header, description text, full-width data table
- System: card with Settings icon header, 2-column form grid, border-separated save footer
- Removed max-w-4xl constraint on Users tab for full-width table

## 2026-02-21 18:10 — Dashboard settings tab redesign

- Redesigned Dashboard settings tab to match new card-based design style
- Styled widget toggles in muted background rows with hover states
- Added LayoutDashboard icon header, border-separated footer with Reset/Preview/Save actions

## 2026-02-21 17:54 — Alerts tab redesign

- Redesigned Alerts settings tab with 3-column layout: config (2/3) + sidebar (1/3)
- Expiry & Schedule card: toggle switches in row, thresholds + frequency + time inputs
- Email (SMTP) and Slack Integration cards side by side with uppercase field labels
- Alert History table with coloured type badges (Warranty/Certificate/Licence)
- Sidebar: Summary card, Manual Operations card (Send Alerts Now, Preview Daily Report)
- Removed max-w-4xl constraint on alerts tab for wider layout

## 2026-02-21 17:44 — Settings page redesign

- Redesigned Settings page with underline-style tab navigation matching mockup
- Redesigned Profile tab: side-by-side Display Name + Email fields, clickable theme picker cards (System/Light/Dark) with icons, styled card sections
- Security & Password section: password fields with show/hide eye toggle, styled card layout
- Added disabled Two-Factor Authentication card placeholder
- Merged password-form.tsx into profile-tab.tsx (password-form.tsx now orphaned)

## 2026-02-21 17:35 — Fix import page Entity Type spacing

- Added explicit mb-3 margin between "Entity Type" label and Select dropdown for visible separation

## 2026-02-21 17:24 — Import page redesign

- Redesigned Import Data page with multi-step wizard: step progress indicator, icon sections, drag-and-drop upload zone with file requirements bar, styled validation results table, and footer action bar
- All import functionality preserved: entity type selection, template download, CSV upload, validation preview, and import execution

## 2026-02-21 17:16 — Reports page redesign

- Redesigned Reports page with "Reports Central" header, icon-based tab navigation cards, stat cards with icons, and styled table sections matching the rest of the app
- All 6 report types updated: Asset Summary, Upcoming Expiries, Licence Summary, Assignments, Lifecycle, Depreciation
- Consistent card styling with `bg-card rounded-xl border` pattern, uppercase tracking-wider table headers, and status dot indicators

## 2026-02-21 16:35 — Fix Expiring Soon dashboard link

- Dashboard "Expiring Soon" card now dynamically links to the correct list page (certificates, applications, or assets) based on which entity type has the most expiring items, filtered to the next 30 days

## 2026-02-21 16:06 — Person detail page redesign

- Redesigned person detail page: large avatar with initials, breadcrumbs, Active/Archived badge, 4-col details grid with uppercase labels, tabbed section for Assets/Certificates/Applications/History

## 2026-02-21 12:50 — Location detail page redesign

- Redesigned location detail page to match other detail pages: icon header with breadcrumbs, uppercase label grid, styled card sections with count badges

## 2026-02-21 12:47 — Asset + Certificate detail page redesign

- Redesigned asset and certificate detail pages to match application detail mockup
- Consistent layout: icon header with breadcrumbs, 2-col details grid with uppercase labels, history timeline in right column
- Expiry dates color-coded (red=expired, orange=expiring soon), auto renewal with check icon
- All action buttons (Check Out, Retire, Sold, Clone, Edit Details) in header row

## 2026-02-21 12:44 — Dashboard fix + Application detail redesign

- Fixed dashboard summary/status breakdown queries to exclude Retired and Sold assets (matches assets page default)
- Redesigned application detail page: icon header with breadcrumbs, 2-col details grid with uppercase labels, seat usage bar, expiry date color coding, auto renewal check icon, history timeline in right column

## 2026-02-21 11:48 — Applications Page Redesign

- Added 4 stat summary cards at top of applications page (Total, Active, Pending Renewal, Expired) using existing dashboard API
- Application Name column now shows colored icon (hashed per app name) + bold name + licence key subtitle
- Expiry Date column now color-coded: red for expired, orange for expiring within 30 days
- Page title updated to "Applications" with new description matching mockup

## 2026-02-21 11:18 — Reassign & Delete Location

- Enhanced DELETE `/locations/{id}` 409 response to include `counts` object (assets, people, certificates, applications)
- Added `GET /locations/{id}/certificates` endpoint
- Added `GET /locations/{id}/applications` endpoint
- Added `POST /locations/{id}/reassign-and-archive` endpoint — atomically moves all items to target location and archives source
- New `ReassignLocationDialog` component — shows item counts by type, location picker, destructive confirm button
- Locations list page: delete on location with items now shows reassign modal instead of error toast
- Location detail page: same reassign flow when archiving location with items

## 2026-02-20 23:28 — UI Redesign: Mockup Alignment

- Moved dashboard widget settings from floating gear icon to dedicated Settings > Dashboard tab with live preview dialog
- Updated light theme colour palette from warm greys to Tailwind slate (cooler, blue-tinged)
- Moved table pagination inside the white card container (was on grey background)
- Table headers now bold uppercase dark text across all pages (assets, certificates, applications, types)
- Sortable column headers (Asset Name, Financials, Name, Type, etc.) now match static header styling
- Filter chips (Type, Status): white background, consistent dark foreground text
- More Filters button: plain text with icon, no background
- More Filters dropdown: replaced FilterChip with native selects for Location/Assigned To, widened panel
- Removed ActiveFilterChips row beneath toolbar buttons
- Deleted unused `widget-settings-popover.tsx`
- Fixed pre-existing build errors: unused `end` variable, missing `expiringItems` in `WIDGET_MIN_SIZES`

## 2026-02-20 21:09 — UI Redesign: Match Mockup Design Language

- **Color scheme**: Primary changed from `#3B82F6` (blue) to `#2918dc` (deep indigo); dark mode primary to `#6366F1`
- **Background**: Updated to `#f6f6f8` for a warmer feel; accent colors now primary-tinted
- **Sidebar**: Added section labels ("MAIN", "MANAGEMENT"), active state with left border accent + primary tint, bumped icons to `h-5 w-5`, added subtitle under logo, height to `h-16`
- **Header**: Height `h-12` → `h-16`, padding `px-4` → `px-8`, added user name/role next to avatar, divider between controls and profile
- **Page headers**: Title `text-lg` → `text-3xl font-bold`, added breadcrumb navigation above title on all list pages
- **Stat cards**: Redesigned with colored icon backgrounds (top-left), trend indicator support, `p-6` padding, `rounded-xl`, shadow-sm baseline, "attention" variant now uses `border-l-4 border-l-red-500`
- **Tables**: Header `px-2` → `px-6 py-4` with uppercase tracking-wider; cells `p-2` → `px-6 py-4`; hover `bg-slate-50/50`; container `rounded-xl`; header row bg-tinted
- **Status badges**: `px-1.5 py-0.5 text-[10px]` → `px-2.5 py-1 text-xs font-medium`; updated to `bg-*-50 text-*-700` color scheme
- **Pagination**: Added "Showing X to Y of Z results" text, Previous/Next text buttons with outlines
- **Dashboard**: Each stat card gets unique colored icon background; status breakdown chart has center total label + percentage legend; activity feed shows avatars with action dots
- **Content area**: Main padding `p-6` → `p-8`
- All existing functionality preserved (CRUD, filters, sorting, pagination, bulk actions, dark mode, sidebar collapse)

## 2026-02-20 20:11 — Asset Creation Fix + Pagination UI Tweak

- Fixed 500 error when creating/updating assets: Jackson couldn't deserialize plain date strings ("2026-02-20") into `Instant` fields — added `FlexibleInstantDeserializer` to accept both plain dates and full ISO-8601 instants
- Made `serialNumber`, `locationId`, `purchaseDate`, `warrantyExpiryDate` nullable in Create/Update Asset DTOs — frontend doesn't always send these fields
- Relaxed validation: serial number and location no longer required on create/update
- Fixed pagination rows-per-page dropdown width too narrow (60px → 70px), "25" was getting clipped

## 2026-02-15 21:13 — Dashboard Widget Link Fixes + Sidebar Border Alignment

- Fixed sidebar header border not aligning with main header border (h-14 → h-12)
- Fixed "Unassigned" widget linking to all Available assets instead of only unassigned ones (added `&unassigned=true`)
- Fixed "Recently Added" widget showing arbitrary count (was top-N limit, now counts assets created in last 7 days)
- Added `createdAfter` filter support to assets API and list page
- Dashboard recently-added endpoint now excludes Retired/Sold assets to match list page defaults
- "Added since" filter chip shown on assets page when navigating from dashboard

## 2026-02-15 20:41 — ESLint Bug Fix Sweep

- Removed unused imports: `Badge` (notifications-bell), `endOfYear` (date-range-picker), Dialog components (person-detail), unused eslint-disable (custom-fields-section)
- Fixed setState-in-effect: `recentSearches` now derived via `useMemo` (command-search), `isLoading` uses lazy initializer (auth-context), offboard-dialog suppressed with justification
- Fixed "cannot access before declared" + missing `useEffect` deps: converted `applyView` to `useCallback` and moved before useEffect in all 9 list/type pages (assets, certificates, applications, people, locations, audit-log, asset-types, certificate-types, application-types)
- Suppressed `react-refresh/only-export-components` in shadcn UI files (badge, button, form, sidebar, tabs) and asset columns
- Suppressed `react-hooks/purity` for shadcn sidebar skeleton `Math.random`
- Suppressed `react-refresh/only-export-components` for `useAuth` in auth-context
- Result: 0 ESLint errors, only 6 `incompatible-library` warnings remaining (React Hook Form / TanStack Table)

## 2026-02-15 20:21 — Attachment Preview Pane

- Inline preview for images (PNG, JPG, GIF) and PDFs via Eye icon button
- Uses blob + object URL pattern to handle auth headers for `<img>`/`<iframe>` src
- Non-previewable files (DOCX, XLSX, etc.) show download only — no eye icon
- Object URLs cleaned up on dialog close to prevent memory leaks

## 2026-02-15 14:24 — File Attachment Support

### Backend
- **V009 migration**: `attachments` table with polymorphic `entity_type` + `entity_id`
- **StorageService interface** + `LocalStorageService` (local filesystem, configurable via `app.upload-dir`)
- **AttachmentsController**: upload (multipart), list, download (streaming), soft-delete
- MIME type allowlist: PDF, images, Office docs, plain text/CSV
- Max file size increased to 10MB
- Audit logging on upload and delete events
- Path traversal protection in storage layer

### Frontend
- **AttachmentsSection** reusable component: upload button, file list with MIME icons, download, delete with confirmation
- Added to asset, certificate, and application detail pages
- React Query hooks for attachment CRUD with cache invalidation

## 2026-02-15 12:07 — Phase B: Notification Centre + User Alerts

### Backend — New Tables & Endpoints
- `user_notifications` table: per-user notification state with read/dismiss/snooze
- `user_alert_rules` table: personal alert rules per user
- `UserNotificationsController`: paginated list, unread count, mark read, dismiss, snooze (1d/3d/1w/until_expiry), mark all read
- `UserAlertRulesController`: CRUD for personal alert rules
- `AlertProcessingService` extended: creates `user_notifications` for all active users (global) and per-user (personal rules) with dedup
- `NotificationCleanupService`: daily scheduled job purges notifications older than 90 days
- Per-type Slack webhooks: warranty, certificate, licence channels with global fallback

### Frontend — Notification Centre
- Enhanced notifications bell: unread count badge, popover with read/snooze/dismiss actions per notification
- Full notification centre page (`/notifications`): Current (unread) and History (all) tabs with pagination
- Entity type badges (warranty/certificate/licence) with urgency coloring
- Click-through navigation to entity detail pages

### Frontend — Personal Alert Rules
- "My Alerts" settings tab (visible to all users): create/edit/delete personal alert rules
- Configure entity types, thresholds, email notification toggle, active/inactive status

### Frontend — Admin Settings
- Per-type Slack webhook fields: Warranties channel, Certificates channel, Licences channel + default fallback
- Sidebar "Notifications" nav item

### DB Migration
- V008: `user_notifications` + `user_alert_rules` tables with indexes and foreign keys

---

## 2026-02-15 10:26 — Phase C: Advanced Filtering + Quick Filter Chips + Saved Filters

### Backend
- Added date range, numeric range, location, person, department, unassigned, and licence type filter params to all 5 list endpoints (Assets, Certificates, Applications, People, Audit Log)
- CSV export endpoints also support all new filter params

### Frontend — Reusable Filter Components
- **DateRangeFilter**: pill-shaped chip with from/to date popover
- **NumericRangeFilter**: pill-shaped chip with min/max number popover
- **ActiveFilterChips**: removable summary chips with "Clear all" button
- **QuickFilterBar**: one-click preset filter buttons

### Frontend — Quick Filters
- **Assets**: Unassigned, Expiring Soon, High Value, In Maintenance
- **Certificates**: Expiring Soon, Expired, Pending Renewal
- **Applications**: Expiring Soon, Expired, Subscription

### Frontend — Per-Page Filters
- **Assets**: location, assigned person, purchase date range, warranty expiry range, cost range, unassigned toggle
- **Certificates**: expiry date range
- **Applications**: expiry date range, licence type, cost range
- **People**: location, department
- **Audit Log**: date range

### Saved Views
- Extended ViewConfiguration with generic `filters` map — saved views now persist all advanced filters
- Loading a saved view restores all filter state; saving captures current filters

## 2026-02-14 17:01 — Phase A: Smart Dashboard + Search + People 360 + Reports Polish

### Dashboard
- New **Inventory Snapshot** widget: spare counts per asset type, expiring this month, checked out, in maintenance — each card clickable to filtered list

### Global Search (Cmd+K)
- Rich result previews: asset type/status, department/job title, expiry countdown, asset counts shown inline
- Category counts in group headers (e.g. "Assets (12)")
- Recent searches stored in localStorage, shown when input is empty

### People
- **360 view**: summary strip with entity counts, tabbed layout (Assets, Certificates, Applications, History)
- New backend endpoints: person summary, person certificates, person applications
- **Offboarding workflow**: "Offboard / Reclaim Assets" dialog — per-item transfer to another person, mark as available, or keep — all in one batch with audit trail
- Optional person archival during offboarding

### Reports
- **Date range controls** on Expiries, Asset Lifecycle, and Licence Summary reports (presets + custom date picker)
- New **Depreciation Report** (6th tab): summary cards (total cost, accumulated depreciation, book value), grouped-by-type table, asset type/location filters, CSV export
- **Print button** with print-friendly CSS on all 6 reports
- Generation timestamps and filter summary lines on all reports
- CSV exports respect active date ranges and filters

## 2026-02-14 15:12 - Security audit: comprehensive hardening (Phases 1-3)

### Phase 1 — Security Critical
- **Startup security validator**: Warns on default JWT secret, admin password, SCIM token, and Swagger enabled at startup
- **Input validation**: Added Jakarta Bean Validation annotations (`@NotBlank`, `@Size`, `@Email`) to all auth and user DTOs, with `@Valid` on controller methods
- **Validation error handler**: Returns structured error responses with field-level details
- **Password policy**: Minimum password length increased from 6 to 8 characters
- **CSV injection fix**: Added `|` (pipe) and `` ` `` (backtick) to dangerous prefix sanitization list
- **SSO open redirect prevention**: Frontend now validates SSO URLs are relative or same-origin before redirecting
- **Swagger disabled by default**: `SWAGGER_ENABLED` now defaults to `false` (set to `true` via env var for local dev)
- **Login audit logging**: All login attempts (success and failure) now written to audit log with details

### Phase 2 — Security Hardening
- **Security headers**: Added `Referrer-Policy: strict-origin-when-cross-origin` and `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` to both SAML and API filter chains
- **JWT filter logging**: Invalid JWT tokens now logged at WARN level with SecurityContext cleared explicitly
- **Error correlation IDs**: Generic 500 errors now include a UUID `errorId` for log correlation
- **Database indexes**: Added missing indexes on `audit_logs.actor_id`, `custom_field_values.entity_id`, and `user_roles.user_id` (V007 migration)

### Phase 3 — Code Quality
- **Standardized authorization**: Replaced manual `isAdmin()` checks in SettingsController with declarative `@PreAuthorize("hasRole('Admin')")` annotations
- **Import page visibility**: Sidebar now hides "Import Data" link from non-admin users

### DB Migration
- V007: `add_foreign_key_indexes` — adds 3 new performance indexes

## 2026-02-14 14:34 - Security hardening round 2c (SAML account takeover + import auth)

- **SAML account takeover prevention**: Email-based auto-linking now only applies to users with `authProvider` of `SAML` or `SCIM` — local users are never silently linked to an SSO identity, preventing account takeover via a malicious IdP
- **Import controller authorization**: `ImportController` now requires Admin role via `@PreAuthorize("hasRole('Admin')")` — previously any authenticated user could bulk-import data
- No DB migrations

## 2026-02-14 14:23 - Security hardening round 2b (follow-up fixes)

- **SAML isActive check**: SAML auth handler now rejects deactivated users before issuing JWT — redirects to `/login?error=account_disabled`
- **Audit logs authorization**: `AuditLogsController` now requires Admin role via `@PreAuthorize("hasRole('Admin')")` — previously accessible to any authenticated user
- No DB migrations

## 2026-02-14 14:00 - Security hardening round 2 (Entra-only auth strategy)

- **JWT isActive check**: JWT filter now verifies user exists and is active in DB on every authenticated request — deactivated user tokens are immediately rejected
- **CSV formula injection**: All 7 CSV export endpoints sanitize cell values — strings starting with `=`, `+`, `-`, `@`, `\t`, `\r` are prefixed with `'` to prevent spreadsheet formula injection
- **Local login gating**: `POST /api/v1/auth/login` can be disabled via `LOCAL_LOGIN_ENABLED=false` env var (returns 404); admin user seeding also skipped when disabled
- **SCIM constant-time comparison**: Bearer token validation uses `MessageDigest.isEqual()` instead of `!=` to prevent timing attacks
- **HTTP security headers**: Added `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` (1 year, includeSubDomains) to both API and SAML filter chains
- **CORS explicit headers**: Replaced wildcard `allowedHeaders: *` with explicit `Content-Type, Authorization, X-Requested-With`
- **Swagger production toggle**: Swagger UI and API docs can be disabled via `SWAGGER_ENABLED=false` env var
- **Docker localhost binding**: All container ports (MySQL 3306, PostgreSQL 5432, MailHog 1025/8025) now bind to `127.0.0.1` only — not exposed on network interfaces
- **Global exception handler**: Unhandled exceptions return generic `{"error": "An internal error occurred"}` — no stack traces leaked to clients
- No DB migrations

## 2026-02-14 13:27 - Security hardening (env-var overrides for production)

- **JWT key**: Now configurable via `JWT_KEY` env var (dev default preserved)
- **DB credentials**: Configurable via `DB_USERNAME`/`DB_PASSWORD` env vars (dev defaults `root/root` preserved)
- **Admin password**: Configurable via `ADMIN_PASSWORD` env var (dev default `admin123` preserved)
- **SCIM endpoint locked down**: `/scim/v2/**` no longer uses `permitAll()` when `scim.enabled=false` (default) — unauthenticated requests now get 403 instead of passing through
- **SCIM bearer token**: Configurable via `SCIM_BEARER_TOKEN` env var (already was, unchanged)
- **Secrets masked in API**: `GET /api/v1/settings/alerts` now returns `********` for `smtpPassword` and `graphClientSecret`, truncates `slackWebhookUrl`; PUT endpoint skips masked values to preserve existing secrets
- **Users listing requires Admin role**: `GET /api/v1/users` now has `@PreAuthorize("hasRole('Admin')")` matching all other user endpoints
- **`@EnableMethodSecurity` added**: `@PreAuthorize` annotations on controllers are now actually enforced (was missing, annotations were silently ignored)
- **Frontend**: Alerts settings form clears masked password values, shows "Leave blank to keep current" placeholder
- No DB migrations

## 2026-02-13 21:55 - Asset templates + asset cloning

- **New entity: Asset Templates** — saved presets per asset type with default values for cost, depreciation, location, notes, and custom fields
- **Backend**: Full CRUD at `POST/GET/PUT/DELETE /api/v1/asset-templates` with optional `?assetTypeId=` filter, custom field value support, and audit logging
- **DB migration**: V006 — `asset_templates` table; custom field values reuse existing `custom_field_values` table
- **Frontend**: Templates list page at `/asset-templates` with asset type filter, form dialog with custom fields support
- **Template picker**: When creating a new asset, selecting an asset type shows a "Template" dropdown to pre-fill form fields (only fills empty fields)
- **Asset cloning**: Clone button on asset detail page opens create form pre-filled from the source asset (type, location, cost, depreciation, notes, custom fields retained; name, serial number, assigned person cleared; status set to Available)
- **Navigation**: Added "Asset Templates" under Inventory group in sidebar

## 2026-02-13 21:17 - Bulk edit for assets

- **Backend**: New `POST /api/v1/assets/bulk-edit` endpoint — accepts optional fields (status, location, assigned person, notes) and applies only the provided fields to selected assets
- **Audit trail**: Full field-level change tracking per asset; person assignment/unassignment logged to person history
- **Frontend**: BulkEditDialog with checkbox-gated fields — only checked fields are sent in the request
- **UI**: "Edit" button added to bulk action bar alongside existing Archive and status buttons
- Fixed AuditService to map "BulkEdited" and "StatusChanged" actions to asset history

## 2026-02-13 21:00 - Update todo.md backlog

- Removed "Relationship linking" (deemed low-value for actual workflow)
- Added three new features to Later: Bulk edit, Asset cloning, Asset kits/bundles

## 2026-02-13 20:36 - Prevent deleting types that are in use

- **Asset types**: Cannot delete an asset type if active (non-archived) assets reference it. Returns 409 with descriptive error message.
- **Certificate types**: Same protection — cannot delete if certificates reference the type.
- **Application types**: Same protection — cannot delete if applications reference the type.
- **Bulk archive**: Skips types that are in use (counts as failed in the response).
- **Frontend**: Error toasts now surface the server's specific error message (e.g. "Cannot delete 'Laptop' because it is used by 11 asset(s)").

## 2026-02-13 19:45 - Global design consistency across all pages

- **Borderless tables**: All DataTable pages (certificates, applications, types, locations, people, audit log) now use `variant="borderless"` matching the assets page aesthetic
- **Count badges**: All list pages now show a total count badge in the PageHeader actions area
- **PageHeader consistency**: Reports, Settings, and Import pages now use the shared `PageHeader` component instead of manual `h1/p` elements
- **FilterChip inline filters**: Certificates, Applications, and Audit Log toolbars converted from popover-based filters to inline `FilterChip` components
- **Standardized search width**: All toolbar search inputs now use `max-w-[240px]`
- **Compound name cells**: Certificates (ShieldCheck icon + serial number), Applications (AppWindow icon + licence key), People (AvatarPlaceholder + email), Locations (MapPin icon + city) now have rich compound name cells with icons and subtitles
- **Assigned To columns**: Certificates and Applications tables now show an AvatarPlaceholder for the assigned person
- **Type table simplification**: Asset Types, Certificate Types, and Application Types now show name + description in a single compound cell (description as subtitle)

## 2026-02-13 13:41 - Remove asset tag, add naming templates, enforce required fields

- **Removed asset tag** from entire stack (~43 files). Asset tag column made nullable in DB, removed from all forms, columns, search, CSV import/export, dashboard widgets, and reports. Name is now the primary identifier.
- **Naming templates per asset type**: Asset types can define a `nameTemplate` (e.g., `COAD-%SERIALNUMBER%`) that auto-generates asset names during creation. Supports `%SERIALNUMBER%` and `%ASSETTYPENAME%` variables. Users can override the generated name.
- **Required field enforcement**: Serial number, location, and purchase date are now mandatory on both frontend (zod validation) and backend (controller validation with 400 responses).
- **Auto-fill depreciation**: When creating an asset, selecting an asset type with a default depreciation period auto-fills the depreciation months field.
- DB migration V005: `asset_tag` nullable + dropped unique index, `name_template` added to `asset_types`

## 2026-02-13 12:31 - Fix depreciation without purchase date

- Depreciation fields (monthly, total, book value) now compute even without a purchase date
- Without purchase date: monthly depreciation shown, total depreciation = £0, book value = full cost
- Fix applies to both API responses and CSV export

## 2026-02-12 17:37 - Add depreciation tracking

- Straight-line depreciation computed on-the-fly: `bookValue`, `totalDepreciation`, `monthlyDepreciation`
- Asset types now have `defaultDepreciationMonths` — auto-fills on asset creation
- `depreciationMonths` wired through asset create/update forms
- Asset detail page shows depreciation section when depreciation is configured
- Dashboard "Total Book Value" stat card shows sum of book values across all assets
- CSV export includes DepreciationMonths, BookValue, TotalDepreciation columns
- DB migration V004: adds `default_depreciation_months` to `asset_types`

## 2026-02-12 12:04 - Add Slack webhook alerts

- New `SlackService` sends Block Kit formatted digest messages to a Slack webhook
- Alert processing now supports Slack-only, email-only, or both channels simultaneously
- `POST /api/v1/alerts/test-slack` endpoint to verify webhook configuration
- Frontend: "Send Test Slack" button in Settings > Alerts > Actions card
- No DB migration needed — `alerts.slack.webhookUrl` setting already exists

## 2026-02-12 10:46 - Grey out Entra-managed fields for SSO/SCIM users

- Admin edit dialog: display name, email, and active toggle disabled for SSO users; role remains editable
- Admin user list: "Reset Password" action hidden for non-LOCAL users
- Profile page: name/email inputs disabled, password form hidden for SSO users
- Added `authProvider` to `UserDetail` TypeScript type

## 2026-02-12 09:50 - Add SAML 2.0 SSO and SCIM 2.0 provisioning

- **SAML 2.0 SSO** (Microsoft Entra ID): SP-initiated login with JIT user provisioning
  - Configurable via `saml.enabled` env var (disabled by default, existing local auth unaffected)
  - `SamlConfig` registers relying party from Entra federation metadata URL
  - `SamlAuthSuccessHandler` extracts SAML attributes, finds/creates user, issues JWT, redirects to frontend
  - Dual `SecurityFilterChain` — Order 1 for SAML paths, Order 2 for API/JWT (existing)
  - `GET /api/v1/auth/sso-config` public endpoint returns SSO state for frontend
  - Dev key generation script at `scripts/generate-saml-keys.sh`
- **SCIM 2.0 provisioning server** for automated user lifecycle from Entra
  - Configurable via `scim.enabled` env var (disabled by default)
  - Bearer token auth via `ScimAuthFilter`
  - Full SCIM endpoints: ServiceProviderConfig, Schemas, ResourceTypes, Users CRUD
  - Supports filter (`userName eq`, `externalId eq`), PATCH (Entra deactivation flow), DELETE (soft deactivate)
- **Auth guards**: local login rejects SSO accounts, password reset blocked for non-LOCAL users, Entra-synced fields (displayName, email, active) are read-only for SSO/SCIM users (only role is editable by admins)
- **DB migration V003**: adds `auth_provider`, `external_id` columns to users; makes `password_hash` nullable
- **Frontend**: login page shows "Sign in with Microsoft" button when SSO enabled, handles SSO token callback
- Added `authProvider` field to user detail and profile DTOs
- Vite proxy updated for `/saml2`, `/login/saml2`, `/scim` paths
- Added Shibboleth Maven repo for OpenSAML dependencies

## 2026-02-12 08:10 - Add duplicate detection on entity creation

- Added `POST /api/v1/{entity}/check-duplicates` endpoints for all 5 entity types (assets, certificates, applications, people, locations)
- Matching strategy: exact match on unique identifiers (assetTag, thumbprint, licenceKey, email), fuzzy (case-insensitive contains) on names and other fields
- Excludes archived records; supports `excludeId` for edit flows; returns max 5 matches
- New shared `DuplicateWarningDialog` component shows potential duplicates with links to existing records
- Create flows in both quick-actions dropdown and list pages now check for duplicates before saving
- Users can review matches and choose "Create Anyway" or "Cancel" to navigate to an existing record
- No DB migrations required

## 2026-02-11 20:49 - Add Microsoft Graph email provider

- Added selectable email provider: SMTP (existing) or Microsoft Graph (new)
- Graph provider uses `com.microsoft.graph` SDK + `com.azure:azure-identity` for client credentials flow
- EmailService refactored with provider pattern — delegates to SMTP or Graph based on `alerts.email.provider` setting
- New settings: `emailProvider`, `graphTenantId`, `graphClientId`, `graphClientSecret`, `graphFromAddress`
- Frontend: provider selector in Alerts tab, conditionally shows SMTP or Graph config fields
- SMTP path unchanged — MailHog still works for local dev

## 2026-02-11 20:19 - Email alerts for expiring items

- Added email sending engine with configurable SMTP (reads config from DB, not Spring auto-config)
- Added `AlertProcessingService`: queries expiring warranties/certificates/licences per threshold, builds grouped HTML digest email, deduplicates via `alert_history` table
- Added `AlertSchedulerService`: dynamic cron scheduling (daily/weekly/biweekly/monthly/first-business-day)
- Added Flyway migration V002 for `alert_history` table
- New endpoints: `POST /api/v1/alerts/send-now`, `POST /api/v1/alerts/test-email`, `GET /api/v1/alerts/history`
- Extended `PUT /api/v1/settings/alerts` with `scheduleType`, `scheduleTime`, `scheduleDay` fields
- Frontend: schedule configuration card, send test email dialog, send alerts now button, alert history table with pagination
- Added MailHog to docker-compose for local email testing (SMTP 1025, UI 8025)
- **DB migration**: V002__alert_history.sql

## 2026-02-11 20:02 - Remove stale postgres MCP server

- Removed `postgres` MCP server from `.mcp.json` (project migrated to MySQL)

## 2026-02-11 18:42 - Fix API port to match frontend proxy

- Changed Kotlin API port from 5116 to 5115 in `application.yml`
- Port 5115 matches the Vite proxy config (`/api` → `http://localhost:5115`)
- Verified full frontend integration: login, dashboard, all CRUD pages, audit log, settings

## 2026-02-11 18:30 - Backend Migration: ASP.NET Core → Spring Boot Kotlin

- **Full backend rewrite** from ASP.NET Core (.NET 10) + PostgreSQL to Spring Boot 3.2 Kotlin + MySQL 8.3
- New API at `apps/api-kt/` — all 21 controllers ported (6,400+ LOC Kotlin)
- All API contracts preserved: same URLs, request/response shapes, status codes
- Flyway migration (`V001__initial_schema.sql`) creates all 33 tables
- JWT auth, audit logging, CSV import/export, custom fields all functional
- Database seeder: Admin/User roles, admin user, 15 default system settings
- Stack: JDK 21, Spring Boot 3.2.5, Hibernate 6.4, Flyway 9.22, jjwt, OpenCSV, SpringDoc OpenAPI
- Docker: MySQL 8.3 service added to `infra/docker-compose.yml`
- Verified end-to-end: login, CRUD, checkout/checkin workflows, audit trail, search, reports, dashboard
- **DB migration**: PostgreSQL → MySQL (CHAR(36) UUIDs, VARCHAR(50) enums, DATETIME(6) timestamps)
- Frontend unchanged — works against new API with no modifications needed

## 2026-02-10 22:01 - Reports Page + Tools Sidebar Group

- Added **Reports** page with 5 pre-built reports: Asset Summary, Upcoming Expiries, Licence Summary, Assignments, Asset Lifecycle
- Added `ReportsController` with 5 endpoints: `/api/v1/reports/asset-summary`, `/expiries`, `/licence-summary`, `/assignments`, `/asset-lifecycle`
- All report endpoints support `?format=csv` for CSV export
- Added new **Tools** collapsible group in sidebar with Reports and Import Data
- Moved Import from Settings tab to standalone page at `/tools/import`
- Settings page now has 4 tabs: Profile, Users, Alerts, System

## 2026-02-10 21:50 - Application Deactivate/Reactivate Workflow

- Added dedicated `POST /api/v1/applications/{id}/deactivate` and `/reactivate` endpoints
- Added `DeactivatedDate` column to Application model (DB migration: AddApplicationDeactivatedDate)
- New `DeactivateApplicationDialog` component with optional notes and date fields
- Detail page shows Deactivate button (for active apps) or Reactivate button (for inactive apps)
- List page row dropdown includes Deactivate action
- Both actions create audit log entries with status change tracking

## 2026-02-10 19:32 - Sidebar Nav Grouping

- Grouped sidebar nav items into collapsible sections: Inventory, Certificates, Software, Organisation
- Dashboard, Audit Log, and Settings remain as standalone top-level items
- Groups expand/collapse on click with chevron rotation animation
- Open/closed state persisted to localStorage
- Active child highlights parent group when collapsed
- Installed shadcn collapsible component (radix-ui)

## 2026-02-10 15:10 - CSV Data Import

- Added Import tab to Settings page (admin only) for bulk CSV import
- Backend: new `ImportController` with 3 endpoints per entity type:
  - `GET /api/v1/import/{entityType}/template` — download CSV template with headers + example rows
  - `POST /api/v1/import/{entityType}/validate` — upload CSV, parse & validate, return row-by-row results
  - `POST /api/v1/import/{entityType}/execute` — upload CSV, create valid records, skip invalid
- Supports 5 entity types: locations, people, assets, certificates, applications
- Validation includes: required fields, max length, enum parsing (case-insensitive), FK resolution by name, asset tag uniqueness, email format, date format (yyyy-MM-dd), boolean parsing, decimal parsing
- Limits: 5MB file size, 10,000 rows max
- Each imported record gets an audit log entry ("Imported via CSV import")
- Frontend: wizard-style ImportTab component with 4 steps (select → upload → preview → results)
- Frontend: added `uploadFile()` method to api-client for multipart form uploads
- New frontend types (`import.ts`) and API module (`import.ts`)

## 2026-02-10 14:05 - CSV Export on All List Pages

- Added `GET /api/v1/{entity}/export` endpoints to all 6 controllers (Assets, Locations, People, Certificates, Applications, AuditLogs)
- Each export endpoint accepts the same filter/sort params as the paged GET, but returns all matching rows as CSV
- Installed CsvHelper 33.1.0 NuGet package for CSV generation
- Added `downloadCsv()` method to frontend api-client for blob download
- Created reusable `ExportButton` component (Download icon + loading spinner)
- Added export functions to all 6 frontend API modules
- Added Export button to toolbar of all 6 list pages (Assets, Locations, People, Certificates, Applications, Audit Log)
- Export respects current filters/sorting — CSV matches what the user sees
- Refactored each controller to extract shared `BuildFilteredQuery` and `ApplySorting` methods (reused by both paged GET and export)

## 2026-02-10 08:31 - Location Detail Page

- Added location detail page at `/locations/:id` with details card, assets table, and people table
- Backend: new `GET /api/v1/locations/{id}/assets` and `GET /api/v1/locations/{id}/people` endpoints
- Backend: new `LocationAssetDto` and `LocationPersonDto` DTOs
- Frontend: new `useLocation`, `useLocationAssets`, `useLocationPeople` hooks
- Location names in the list page are now clickable links to the detail page
- Detail page includes Edit and Archive actions (reuses existing dialogs)

## 2026-02-10 08:02 - Header Enhancements (5 Features)

- **Feature 1 — Sidebar Toggle**: Added `SidebarTrigger` to the header for collapsing/expanding the sidebar
- **Feature 2 — Breadcrumbs**: Route-aware breadcrumbs in the header; static segments from route map, dynamic entity names resolved from React Query cache; settings tab names shown as nested crumbs
- **Feature 3 — Global Search (Cmd+K)**: New `SearchController` (`GET /api/v1/search?q=term`) searches across Assets (name, tag), Certificates, Applications, People, and Locations; frontend command palette with debounced search, grouped results, and keyboard navigation
- **Feature 4 — Quick Actions (+New)**: Dropdown menu in header to create any entity (Asset, Certificate, Application, Person, Location) from anywhere; reuses existing form dialogs and mutation hooks
- **Feature 5 — Notifications Bell**: New `NotificationsController` (`GET /api/v1/notifications/summary`) returns upcoming expiry counts using alert threshold settings as lookahead window; frontend bell icon with badge count and popover listing expiring warranties, certificates, and licences with "expires in X days" labels
- **Header layout**: `[SidebarTrigger] [Breadcrumbs ...flex-1...] [Search ⌘K] [+New] [🔔 Bell] [🌓 Theme] [👤 Avatar]`
- **New backend files**: `SearchController.cs`, `SearchDtos.cs`, `NotificationsController.cs`, `NotificationDtos.cs`
- **New frontend files**: `breadcrumbs.tsx`, `command-search.tsx`, `quick-actions.tsx`, `notifications-bell.tsx`, `search.ts`, `notifications.ts`, `use-search.ts`, `use-notifications.ts`
- **shadcn component installed**: `breadcrumb`

## 2026-02-08 22:07 - Settings Page with Profile, Users, Alerts & System Config

- **Backend**: Added `SystemSetting` model (key-value store, `Key` as PK)
- **Backend**: Added `ThemePreference` to `User` model
- **Backend**: EF Migration: `AddSystemSettingsAndUserTheme`
- **Backend**: Seed data: "User" role, default system settings (org name, currency, date format, page size), default alert settings (thresholds, SMTP, Slack)
- **Backend**: New `ProfileController` — `PUT /api/v1/profile` (update display name, email, theme), `PUT /api/v1/profile/password` (change password)
- **Backend**: New `SettingsController` — `GET/PUT /api/v1/settings/system` and `GET/PUT /api/v1/settings/alerts` (admin only for writes)
- **Backend**: New `RolesController` — `GET /api/v1/roles` (admin only)
- **Backend**: Expanded `UsersController` — full CRUD: list (with `?includeInactive`), get by ID, create, update (name/email/role/active), reset password (all admin-only except list)
- **Backend**: `UserProfileResponse` now includes `themePreference`
- **Frontend**: Settings page at `/settings` with tabbed layout (URL-driven `?tab=profile|users|alerts|system`)
- **Frontend**: Profile tab — edit display name, email, theme preference; change password with validation
- **Frontend**: Users tab (admin only) — DataTable with role badges & status badges, add/edit user dialogs, reset password dialog
- **Frontend**: Alerts tab (admin only) — toggle switches for warranty/certificate/licence alerts, configurable thresholds, SMTP config, Slack webhook, recipients
- **Frontend**: System tab (admin only) — organisation name, currency, date format, default page size
- **Frontend**: Auth context now exposes `isAdmin` boolean and `updateUser()` method; syncs theme preference to localStorage on login
- **Frontend**: User menu now has "Profile" link that navigates to `/settings?tab=profile`
- **Frontend**: Added shadcn `Tabs` and `Switch` UI components

## 2026-02-08 21:49 - Person Detail Page with Full History Tracking

- **Backend**: Added `PersonHistory` + `PersonHistoryChange` tables (EF migration: `AddPersonHistory`)
- **Backend**: Added `PersonHistoryEventType` enum (Created, Edited, Archived, Restored, AssetAssigned, AssetUnassigned, AssetCheckedOut, AssetCheckedIn)
- **Backend**: `AuditService` now creates `PersonHistory` records with field-level change tracking for Person entities
- **Backend**: Asset checkout/checkin/retire/sell/update now log entries to person history when assignment changes
- **Backend**: `PeopleController.Update` now tracks field-level changes (Full Name, Email, Department, Job Title, Location)
- **Backend**: Added `GET /api/v1/people/{id}/history` endpoint — returns person history with field-level changes
- **Backend**: Added `GET /api/v1/people/{id}/assets` endpoint — returns non-archived assets assigned to a person
- **Frontend**: New person detail page at `/people/:id` with info card, assigned assets table, and history timeline
- **Frontend**: Person history timeline shows field-level changes (matching asset history pattern)
- **Frontend**: Person name in People list is now a clickable link to detail page
- **Frontend**: Added "View" action to person row dropdown menu
- **Frontend**: History timeline with "View All History" dialog for full audit trail

## 2026-02-08 20:58 - Dashboard Stat Cards Redesign

- **Frontend**: Redesigned dashboard stat cards with coloured circular icons, big bold numbers, and labels
- **Frontend**: All 8 stat cards are now clickable — navigate to filtered list views
- **Frontend**: Stat cards locked to fixed 3×2 grid size (draggable but not resizable)
- **Frontend**: Converted 6 list widgets (recently added, unassigned, checked out, warranty/cert/licence expiries) to number-only stat cards
- **Frontend**: Updated default dashboard layout — 8 stat cards in top 2 rows, charts below
- **Frontend**: Removed per-widget expiry day selectors (hardcoded to 30 days)
- **Frontend**: Added dark mode support for stat card icon backgrounds

## 2026-02-08 20:38 - Bulk Actions for Type & People Pages

- **Backend**: Added `POST /api/v1/assettypes/bulk-archive` endpoint
- **Backend**: Added `POST /api/v1/certificatetypes/bulk-archive` endpoint
- **Backend**: Added `POST /api/v1/applicationtypes/bulk-archive` endpoint
- **Backend**: Added `POST /api/v1/people/bulk-archive` endpoint
- **Frontend**: Added `bulkArchive()` to asset-types, certificate-types, application-types, and people API clients
- **Frontend**: Added `useBulkArchive*` hooks for all four entity types
- **Frontend**: Integrated row selection + bulk archive on Asset Types, Certificate Types, Application Types, and People pages

## 2026-02-08 20:27 - Bulk Actions for List Pages

- **Backend**: Added `POST /api/v1/assets/bulk-archive` and `POST /api/v1/assets/bulk-status` endpoints
- **Backend**: Added `POST /api/v1/certificates/bulk-archive` and `POST /api/v1/certificates/bulk-status` endpoints
- **Backend**: Added `POST /api/v1/applications/bulk-archive` and `POST /api/v1/applications/bulk-status` endpoints
- **Backend**: Added `BulkArchiveRequest`, `BulkStatusRequest`, and `BulkActionResponse` DTOs
- **Backend**: Each bulk operation audits per-item and returns succeeded/failed counts
- **Frontend**: Added `bulkArchive()` and `bulkStatus()` to all three API client files
- **Frontend**: Added `useBulkArchive*` and `useBulkStatus*` hooks for all three entity types
- **Frontend**: Added row selection support to `DataTable` component (`rowSelection`, `onRowSelectionChange`, `getRowId`)
- **Frontend**: Created `data-table-selection-column.tsx` — reusable checkbox column (header select-all + row select)
- **Frontend**: Created `bulk-action-bar.tsx` — sticky bar showing selected count, action buttons, and clear selection
- **Frontend**: Integrated bulk actions on Assets page (Archive, Available, Assigned, In Maintenance)
- **Frontend**: Integrated bulk actions on Certificates page (Archive, Active, Expired, Revoked, Pending Renewal)
- **Frontend**: Integrated bulk actions on Applications page (Archive, Active, Expired, Suspended, Pending Renewal, Inactive)
- **Frontend**: Bulk archive shows confirmation dialog; status changes apply immediately
- **Frontend**: Selection clears after successful bulk operation

## 2026-02-08 16:44 - Type Filter + Grouped View for List Pages

- **Backend**: Added `typeId` query parameter to Assets, Certificates, and Applications `GetAll` endpoints
- **Frontend**: Added Type filter dropdown to all three list page filter popovers
- **Frontend**: Added `typeId` to query param interfaces and saved view configuration
- **Frontend**: Added view mode toggle (List / Grouped) to all three list pages
- **Frontend**: Created `GroupedGridView` component that groups items by type with collapsible sections
- **Frontend**: Created entity card components (`AssetCard`, `CertificateCard`, `ApplicationCard`) for grouped view
- **Frontend**: Created `ViewModeToggle` segmented control component
- **Frontend**: Extended `DataTable` to support `hideTable` + `children` for alternate views
- **Frontend**: Type filter and view mode are persisted in URL params and saved views

## 2026-02-08 15:53 - Restore Retire/Sell Asset Workflow

- **Fix**: Restored retire and sell asset dialogs, API endpoints, and hooks accidentally removed during list filter overhaul
- **Backend**: Restored `POST /assets/{id}/retire` and `POST /assets/{id}/sell` endpoints
- **Backend**: Restored `RetireAssetRequest` and `SellAssetRequest` DTOs
- **Backend**: Added `SoldDate`, `SoldPrice`, `RetiredDate` back to `AssetDto`
- **Backend**: Restored `RetiredDate` property on `Asset` model (no-op migration to sync snapshot)
- **Backend**: Restored "Retired" and "Sold" mappings in `AuditService`
- **Frontend**: Restored `RetireAssetDialog` and `SellAssetDialog` components
- **Frontend**: Restored retire/sell buttons on asset detail page (hidden for already retired/sold assets)
- **Frontend**: Restored `soldDate`, `soldPrice`, `retiredDate` display on asset detail page
- **Frontend**: Restored `useRetireAsset` and `useSellAsset` hooks + API client methods
- **Frontend**: Restored `RetireAssetRequest`, `SellAssetRequest` types + sold/retired fields on `Asset` type
- **DB migration**: `RestoreRetiredDateToSnapshot` (no-op — column already existed)

## 2026-02-08 15:29 - List Filter Overhaul + Application Inactive Status

- **Backend**: Added `Inactive` value to `ApplicationStatus` enum (DB migration `AddApplicationInactiveStatus`)
- **Backend**: New `includeStatuses` query param on all three list endpoints (`/assets`, `/applications`, `/certificates`)
- **Backend**: Assets default list now excludes `Retired` and `Sold` statuses; `includeStatuses=Retired,Sold` opts them back in
- **Backend**: Applications default list now excludes `Inactive` status; `includeStatuses=Inactive` opts it back in
- **Backend**: Certificates endpoint accepts `includeStatuses` for API consistency (no hidden statuses currently)
- **Frontend**: Replaced status `<Select>` dropdown on all three list toolbars with `<Popover>` containing status filter + include checkboxes
- **Frontend**: Assets toolbar: checkboxes for "Include retired" and "Include sold"
- **Frontend**: Applications toolbar: checkbox for "Include inactive"
- **Frontend**: Certificates toolbar: popover with status filter only (no hidden statuses)
- **Frontend**: Filter state persists in URL params (`includeRetired`, `includeSold`, `includeInactive`)
- **Frontend**: Filter button shows badge count when filters are active
- **Frontend**: Added `Inactive` status badge styling for applications (slate theme)
- **Frontend**: Added `Inactive` to application form status dropdown

## 2026-02-08 14:21 - Mark MVP Complete

- **Chore**: Mark "DataTable: saved views per user" as complete in todo.md — all Next (MVP) items are now done

## 2026-02-08 14:08 - Default View + Column Visibility Fix

- **Fix**: Assets page no longer hides standard columns (Type, Assigned To) on initial load — replaced dual-useEffect initialization with simpler pattern that merges custom field visibility as defs load
- **UX**: Added synthetic "Default" view entry at top of Views dropdown on all 9 list pages — always visible, resets columns/sort/filters to page defaults
- **UX**: "Update current view" option hidden when on Default view; trigger button shows "Default" instead of "Views" when no custom view is active

## 2026-02-08 13:47 - Saved Views

- **Backend**: New `SavedView` model with `SavedViews` table (DB migration `AddSavedViews`)
- **Backend**: New `SavedViewsController` — CRUD endpoints at `/api/v1/saved-views` (scoped per user + entity type)
- **Backend**: Endpoints: GET (list by entityType), POST (create), PUT (update), DELETE, PUT `/{id}/default` (toggle default)
- **Frontend**: New `SavedViewSelector` component — dropdown to apply, save, rename, delete, and set default views
- **Frontend**: New API layer, types, and React Query hooks for saved views
- **Frontend**: `DataTable` now supports external `columnVisibility` / `onColumnVisibilityChange` props
- **Frontend**: All 9 list pages integrated (assets, certificates, applications, locations, people, asset-types, certificate-types, application-types, audit-log)
- **Frontend**: Default saved view auto-applies on page load; views capture column visibility, sort, filters, and page size

## 2026-02-07 22:32 - User Authentication (JWT)

- **Backend**: Added JWT Bearer authentication with BCrypt password hashing
- **Backend**: New `AuthController` — `POST /api/v1/auth/login` (returns JWT + user profile), `GET /api/v1/auth/me`
- **Backend**: New services — `ITokenService`/`TokenService`, `ICurrentUserService`/`CurrentUserService`
- **Backend**: All controllers (except Health) now require `[Authorize]` attribute
- **Backend**: Audit logging now captures `ActorId` and `ActorName` from JWT claims (was always "System")
- **Backend**: Admin user seeded on startup (`admin`/`admin123`) with "Admin" role
- **Backend**: JWT config in `appsettings.json` (Key, Issuer, Audience, ExpiryHours)
- **Frontend**: Login page with zod-validated form, centered card layout
- **Frontend**: `AuthProvider` context — manages token, user profile, login/logout
- **Frontend**: `ProtectedRoute` wrapper — redirects to `/login` if unauthenticated
- **Frontend**: API client sends `Authorization: Bearer` header; auto-redirects to `/login` on 401
- **Frontend**: User menu in header — shows initials, display name, email, logout option
- **Default dev credentials**: `admin` / `admin123`

## 2026-02-07 22:06 - Applications/Licences Module (full stack)

- **Backend**: New models — `ApplicationType`, `Application`, `ApplicationHistory`, `ApplicationHistoryChange`
- **Backend**: New enums — `ApplicationStatus` (Active, Expired, Suspended, PendingRenewal), `ApplicationHistoryEventType`, `LicenceType` (PerSeat, Site, Volume, OpenSource, Trial, Freeware, Subscription, Perpetual)
- **Backend**: Extended `CustomFieldDefinition` with `ApplicationTypeId` for application-type-scoped custom fields
- **Backend**: New `ApplicationTypesController` — full CRUD with paging, sorting, search, custom field definitions
- **Backend**: New `ApplicationsController` — full CRUD with paging, sorting, search, status filter, custom field values, change-tracked history
- **Backend**: `AuditService` extended to create `ApplicationHistory` records on Application entity changes
- **Backend**: Dashboard endpoints — `GET /api/v1/dashboard/licence-expiries?days=30`, `GET /api/v1/dashboard/application-summary`
- **Backend**: DB migration `AddApplicationsModule` applied
- **Frontend**: Application Types page — full CRUD with custom field editor, paging, sorting, search
- **Frontend**: Applications page — full CRUD with paging, sorting, search, status filter, form with licence fields and custom fields
- **Frontend**: Application detail page — info card, custom fields display, history timeline, edit dialog
- **Frontend**: Licence Expiries dashboard widget with configurable timeframe
- **Frontend**: Routes added: `/application-types`, `/applications/:id`
- **Frontend**: Sidebar nav: added Application Types item

## 2026-02-07 21:25 - Certificates Module (full stack)

- **Backend**: New models — `CertificateType`, `Certificate`, `CertificateHistory`, `CertificateHistoryChange`
- **Backend**: New enums — `CertificateStatus` (Active, Expired, Revoked, PendingRenewal), `CertificateHistoryEventType`
- **Backend**: Extended `CustomFieldDefinition` with `CertificateTypeId` for certificate-type-scoped custom fields
- **Backend**: New `CertificateTypesController` — full CRUD with paging, sorting, search, custom field definitions
- **Backend**: New `CertificatesController` — full CRUD with paging, sorting, search, status filter, custom field values, change-tracked history
- **Backend**: `AuditService` extended to create `CertificateHistory` records on Certificate entity changes
- **Backend**: Dashboard endpoints — `GET /api/v1/dashboard/certificate-expiries?days=30`, `GET /api/v1/dashboard/certificate-summary`
- **Backend**: DB migration `AddCertificatesModule` applied
- **Frontend**: Certificate Types page — full CRUD with custom field editor, paging, sorting, search
- **Frontend**: Certificates page — full CRUD with paging, sorting, search, status filter, form with custom fields
- **Frontend**: Certificate detail page — info card, custom fields display, history timeline, edit dialog
- **Frontend**: Certificate Expiries dashboard widget with configurable timeframe
- **Frontend**: Routes added: `/certificate-types`, `/certificates/:id`
- **Frontend**: Sidebar nav: added Certificate Types item

## 2026-02-07 20:01 - Server-side pagination for Locations, Asset Types, People & Audit Logs

- **Backend**: `GET /api/v1/locations` now accepts `page`, `pageSize`, `search`, `sortBy`, `sortDir` query params; returns `PagedResponse<LocationDto>`
- **Backend**: `GET /api/v1/assettypes` now accepts `page`, `pageSize`, `search`, `sortBy`, `sortDir` query params; returns `PagedResponse<AssetTypeDto>`
- **Backend**: `GET /api/v1/people` now accepts `page`, `pageSize`, `search`, `sortBy`, `sortDir` query params; returns `PagedResponse<PersonDto>`. Search filters on fullName + email
- **Backend**: `GET /api/v1/auditlogs` now accepts `page`, `pageSize`, `search`, `entityType`, `action`, `sortBy`, `sortDir` query params; returns `PagedResponse<AuditLogDto>`. Removed `limit` param. Upgraded search to case-insensitive ILike
- **Frontend**: All four list pages now use URL-driven state (page/pageSize/search/sort), debounced search, `<DataTablePagination>`, column toggle, and server-side sorting
- **Frontend**: `getAll()` wrappers updated to use `pageSize=1000` so form dropdowns (locations, asset types in asset form) continue to work unchanged
- **Frontend**: New hooks: `usePagedLocations()`, `usePagedAssetTypes()`, `usePagedPeople()`, `usePagedAuditLogs()` — all with `keepPreviousData`

## 2026-02-07 19:38 - Server-side pagination, sorting & filtering for Assets

- **Backend**: New `PagedResponse<T>` generic DTO for paged API responses
- **Backend**: `GET /api/v1/assets` now accepts `page`, `pageSize`, `search`, `status`, `sortBy`, `sortDir` query params
- **Backend**: Search filters on name and asset tag (case-insensitive), status filters by enum value
- **Backend**: Supports sorting by name, assetTag, status, assetTypeName, locationName, purchaseDate, purchaseCost, warrantyExpiryDate, createdAt
- **Frontend**: `apiClient.get()` now accepts optional `params` arg for query string building
- **Frontend**: New `PagedResponse<T>` TypeScript type, new `AssetQueryParams` interface
- **Frontend**: New `usePagedAssets()` hook with `keepPreviousData` for smooth page transitions
- **Frontend**: New reusable `<DataTablePagination>` component (page nav, rows-per-page selector, total count)
- **Frontend**: `<DataTable>` now supports optional server-side mode via `manualPagination`, `manualSorting`, `paginationControls` props
- **Frontend**: `<AssetsToolbar>` switched from column-filter-based to callback-based search/status filtering
- **Frontend**: Assets page orchestrates all state via URL search params (bookmarkable, back-button friendly)
- **Frontend**: Debounced search input (300ms) prevents excessive API calls
- No DB migrations. Locations, AssetTypes, and Dashboard pages unaffected.

## 2026-02-07 19:12 - Column visibility toggle for DataTable

- **Frontend**: New reusable `<ColumnToggle>` component — dropdown with checkboxes to show/hide columns
- **Frontend**: Added to assets toolbar; custom field columns (hidden by default) can now be toggled visible
- **Frontend**: Actions column marked as non-hideable

## 2026-02-07 18:41 - Custom Fields (define per asset type, render in forms, DataTable columns)

- **Backend**: New DTOs (`CustomFieldDto.cs`), endpoints for custom field CRUD
- **Backend**: `GET /api/v1/assettypes` and `GET /api/v1/assettypes/{id}` now return `customFields` array
- **Backend**: `GET /api/v1/assettypes/{id}/customfields` returns active definitions ordered by sortOrder
- **Backend**: Create/update asset type reconciles custom field definitions (add/update/archive)
- **Backend**: Create/update asset accepts `customFieldValues` array, validates against asset type definitions
- **Backend**: Audit log tracks custom field value changes (prefixed `Custom:`)
- **Frontend**: Custom field editor in Asset Type create/edit dialog (add/remove/reorder fields, set type/options/required)
- **Frontend**: Dynamic custom fields section in Asset form (renders Text, Number, Date, Boolean, SingleSelect, MultiSelect, URL inputs based on definitions)
- **Frontend**: Custom field columns in Assets DataTable (hidden by default, toggleable via column visibility)
- **DB Migration**: `ConfigureCustomFieldValueEntityFK` — maps `Asset.CustomFieldValues` via `EntityId` FK, drops shadow `AssetId` column
- Supported field types: Text, Number, Date, Boolean, SingleSelect, MultiSelect, URL

## 2026-02-07 17:49 - Replace @dnd-kit with react-grid-layout for free-form dashboard grid

- **Frontend**: Replaced @dnd-kit (list-based reordering) with react-grid-layout v2 (true free-form grid)
- Widgets now have explicit `{x, y, w, h}` positions on a 12-column grid
- Drag widgets to any open cell; other widgets reflow with vertical compaction
- Resize widgets by dragging edges/corners (per-widget minimum sizes enforced)
- Responsive breakpoints: lg (12 cols), md (6 cols), sm (1 col)
- Layout persists to localStorage across sessions
- All widget components updated with flex sizing to fill their grid cells
- Removed @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities dependencies
- Deleted sortable-widget.tsx, replaced with dashboard-widget.tsx wrapper
- Total Assets and Total Value are now independent widgets (can be resized separately)
- Warranty Expiries settings icon aligned inline with drag handle
- Bar charts now use a 10-colour palette instead of monochrome black/primary bars

## 2026-02-07 17:24 - Dashboard reflow, drag-and-drop reordering, 4 new widgets

- **Frontend**: Dashboard grid now reflows — hiding widgets no longer leaves empty gaps (flat single grid replaces paired 2-column rows)
- **Frontend**: Drag-and-drop widget reordering via @dnd-kit — drag handle appears on hover, order persisted to localStorage
- **Frontend**: Accessible drag support (pointer + keyboard sensors)
- **Backend**: 4 new dashboard endpoints: `GET /api/v1/dashboard/recently-added?limit=N`, `assets-by-age`, `unassigned`, `value-by-location`
- **Frontend**: 4 new widgets — Recently Added (list), Assets by Age (horizontal bar chart), Unassigned Assets (list), Value by Location (bar chart with £ formatting)
- **Frontend**: New widgets appear in Customize popover and can be toggled/reordered
- **Frontend**: Existing user preferences auto-merge new widget IDs on load
- **Dependencies**: Added `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

## 2026-02-07 17:13 - Dashboard widget polish

- **Frontend**: Status breakdown pie chart — removed segment labels (legend+tooltip remain), clicking a segment navigates to `/assets?status=X`
- **Frontend**: Assets page reads `?status=` URL param and pre-filters the table; status dropdown in toolbar syncs with URL
- **Frontend**: Total Value card icon changed from $ to £ (PoundSterling)
- **Frontend**: Warranty expiries widget — added settings cog with timeframe popover (7d/14d/30d/60d/90d)
- **Frontend**: DataTable now accepts `initialColumnFilters` prop

## 2026-02-07 16:20 - Dashboard with customizable widgets

- **Backend**: New `DashboardController` with 6 endpoints: `GET /api/v1/dashboard/summary`, `status-breakdown`, `warranty-expiries?days=N`, `assets-by-type`, `assets-by-location`, `checked-out`
- **Backend**: Added `limit` query parameter to `GET /api/v1/auditlogs` for recent activity widget
- **Frontend**: Full dashboard page with 7 widgets — stat cards (total assets + total value), status breakdown pie chart, warranty expiries list, assets by type/location bar charts, recent activity feed, checked out assets list
- **Frontend**: Widget customization — Settings popover with checkboxes to toggle widgets on/off, preferences persisted to localStorage
- **Frontend**: Each widget fetches independently via React Query (own loading/error states, disabled widgets skip API calls)
- **Frontend**: Charts via recharts library; colour-coded urgency badges on warranty expiries (red <=7d, amber <=14d)
- **Dependencies**: Added `recharts`, shadcn `checkbox` component

## 2026-02-07 14:56 - Add entity name to audit log

- **Backend**: Added `EntityName` column to `AuditLog` model (nullable, for backwards-compatibility)
- **Backend**: All controllers now pass entity name when logging audit entries (denormalized at write time)
- **Backend**: Audit log search also matches on entity name
- **Frontend**: Renamed "Entity ID" column to "Entity" — shows entity name, falls back to truncated ID for old records
- **DB Migration**: `AddEntityNameToAuditLog` — adds nullable `EntityName` column

## 2026-02-07 14:40 - Audit log UI polish

- **Frontend**: Colour-coded action badges (green=Created/CheckedIn, blue=Updated, gray=Archived, amber=CheckedOut)
- **Frontend**: Tooltip on truncated details column to reveal full text on hover

## 2026-02-07 14:29 - Audit log UI page

- **Backend**: New read-only `GET /api/v1/auditlogs` endpoint with optional `entityType`, `action`, and `search` query filters
- **Frontend**: Full audit log page with DataTable showing timestamp, actor, action, entity type, entity ID, source, and details
- **Frontend**: Client-side filtering toolbar — text search on details, entity type select, action select
- **Frontend**: Asset entity IDs link to asset detail page

## 2026-02-07 14:14 - Check-in / check-out workflow

- **Backend**: New `POST /api/v1/assets/{id}/checkout` and `POST /api/v1/assets/{id}/checkin` endpoints
- **Checkout**: Validates asset is Available or Assigned, sets status to CheckedOut and assigns person
- **Checkin**: Validates asset is CheckedOut, sets status to Available and clears assignment
- **Audit**: Both actions log field-level changes (Status, Assigned To) to asset history timeline
- **Frontend**: Checkout dialog with person combobox + optional notes
- **Frontend**: Checkin dialog with confirmation + optional notes
- **Frontend**: Check Out / Check In buttons on asset detail page (shown contextually based on status)
- No DB migration needed — existing enums and fields already supported CheckedOut/CheckedIn

## 2026-02-07 13:39 - Fix date bug + history improvements

- **Bug fix**: Dates now sent with UTC `Z` suffix (e.g. `2025-01-15T00:00:00Z`) — fixes Npgsql rejection of `DateTime(Kind=Unspecified)` for `timestamp with time zone` columns
- **Field-level change tracking**: Edit history now records exactly which fields changed, with old and new values. New `AssetHistoryChanges` table + `AssetHistoryChange` model.
- **History timeline shows changes**: "Edited" entries display inline list of changed fields (e.g. `Name: "MacBook" → "MacBook Pro"`)
- **History limit + View All**: Asset detail sidebar caps history at 5 entries. "View All History" button opens a scrollable dialog with the full timeline.
- **New endpoint param**: `GET /api/v1/assets/{id}/history?limit=N` — optional limit query parameter
- **DB migration**: `AddAssetHistoryChanges` — creates `AssetHistoryChanges` table with FK to `AssetHistory`

## 2026-02-06 23:53 - Asset detail page + date bug fix

- **Bug fix**: Creating/editing assets with dates (Purchase Date, Warranty Expiry) now works — frontend converts `"YYYY-MM-DD"` to `"YYYY-MM-DDT00:00:00"` before sending to API
- **History endpoint**: `GET /api/v1/assets/{id}/history` — returns `AssetHistoryDto` list ordered by timestamp descending, includes performer display name
- **Asset detail page** (`/assets/:id`): Shows asset info in two-column card layout + history timeline sidebar. Edit button opens existing form dialog. Back button returns to list.
- **History timeline component**: Vertical timeline with colour-coded dots per event type (Created, Edited, Assigned, etc.)
- **Clickable table links**: Asset Tag and Name columns in the assets DataTable are now links to the detail page
- **New shadcn component**: Card
- No DB migration needed

## 2026-02-06 23:24 - Asset assignment: User → Person + searchable combobox

- **Breaking DB change**: `Asset.AssignedUserId` (FK to Users) replaced with `Asset.AssignedPersonId` (FK to People). Migration `ChangeAssetAssignmentToPersonFromUser` drops old column and adds new one.
- **People search endpoint**: `GET /api/v1/people/search?q=&limit=5` — lightweight `{id, fullName}` results, ILike filtering, returns first 5 by default
- **PersonCombobox component**: Searchable combobox (Popover + Command) replaces static Select for "Assigned To" field. Shows 5 people initially, narrows as user types, includes "None" option.
- **Frontend types/schema**: `assignedUserId`/`assignedUserName` → `assignedPersonId`/`assignedPersonName` across types, schema, columns, form, and page
- **Removed `useUsers` dependency** from assets page — combobox handles its own data fetching via `usePeopleSearch` hook
- **New shadcn components**: popover, command (with cmdk dependency)

## 2026-02-06 23:03 - People management (CRUD)

- **People model**: New `Person` entity (FullName, Email, Department, JobTitle, LocationId FK) with soft delete via `IsArchived`
- **People API** (`/api/v1/people`): Full CRUD — list active people (with location name), get by ID, create, update, soft delete. LocationId validated against active locations. All writes audit-logged.
- **People frontend**: Full CRUD page at `/people` — DataTable with sortable Full Name column, filter-by-name toolbar, form dialog with Location dropdown, confirm dialog for delete, toast feedback
- **Sidebar**: Added "People" nav item with Users icon after Locations
- **DB migration**: `AddPeopleTable` — creates `People` table with FK to `Locations` (SetNull on delete)

## 2026-02-06 22:45 - Assign user to asset

- **Users API** (`GET /api/v1/users`): Read-only endpoint returning active users ordered by display name
- **Asset assignment**: `AssignedUserId` and `AssignedUserName` added to Asset DTOs and API request/response
- **Validation**: AssignedUserId (if provided) must reference an existing active user
- **Frontend**: "Assigned To" dropdown in Add/Edit Asset form with auto-status logic — selecting a user auto-sets status to "Assigned"; clearing user reverts to "Available" (unless manually changed)
- **DataTable**: "Assigned To" column showing assigned user's display name
- No DB migration needed — `AssignedUserId` FK already exists on Assets table

## 2026-02-06 22:28 - Assets CRUD end-to-end + Audit logging

- **Audit logging service**: Reusable `IAuditService` / `AuditService` — every controller write operation now creates an `AuditLog` record; asset writes also create per-asset `AssetHistory` entries
- **Assets API** (`/api/v1/assets`): Full CRUD with validation (AssetType exists, Location exists, unique AssetTag, valid Status enum). Returns flattened DTOs with `assetTypeName` and `locationName`. Soft delete via `IsArchived` flag.
- **Retrofit audit logging**: LocationsController and AssetTypesController now log Created/Updated/Archived events via `IAuditService`
- **Asset Types frontend**: Full CRUD page at `/asset-types` — mirrors Locations pattern (types, API client, React Query hooks, Zod schema, DataTable with sorting/filtering, form dialog, confirm dialog, toasts)
- **Assets frontend**: Full CRUD page at `/assets` — complex form with Select dropdowns for AssetType, Location, Status; date inputs for PurchaseDate and WarrantyExpiry; cost field; notes textarea. Status badge component with colour-coded labels.
- **Sidebar**: Added "Asset Types" nav item with Tag icon
- **shadcn/ui**: Added Select and Textarea components
- No DB migration needed — all tables already existed from initial scaffold

## 2026-02-06 21:57 - Locations page: full CRUD with API integration

- **Foundation layer**: API client (fetch wrapper with typed errors), React Query provider, Sonner toast notifications
- **Locations API integration**: Types mirroring backend DTOs, API functions, React Query hooks (useLocations, useCreateLocation, useUpdateLocation, useArchiveLocation)
- **Zod validation schema** for location forms (name required 1-200 chars, optional address/city/country)
- **Shared components**: PageHeader (title + description + actions), ConfirmDialog (AlertDialog wrapper), enhanced DataTable (shadcn Table + sorting + filtering + column visibility + toolbar slot)
- **Locations page**: Full CRUD — create/edit via form dialog, delete via confirmation dialog, filter-by-name search, sortable Name column, row action menus, loading skeleton, error state, toast feedback
- **New shadcn/ui components**: dialog, form, label, table, sonner, badge, alert-dialog
- **Dependencies added**: @tanstack/react-query, react-hook-form, zod, @hookform/resolvers, sonner
- **Fixed**: components.json aliases from `src/` to `@/` so shadcn imports resolve during Vite build

## 2026-02-06 21:26 - Polish sidebar header + collapse behaviour

- Moved collapse/expand toggle from sidebar footer to sidebar header
- Toggle is now icon-only (ChevronLeft) next to "Asset Manager" title
- Collapsed state shows circular "AM" brand badge (clickable to expand)
- Fixed divider alignment: sidebar header now uses `h-14` to match main content header
- Removed SidebarFooter entirely (toggle lives in header)
- No changes to shadcn/ui primitives or layout.tsx

## 2026-02-06 20:56 - Stricter git workflow rules

- Updated CLAUDE.md: Claude must never merge into main or push to main
- Merging to main is only via GitHub PR or by the user manually
- Only feature/fix/docs/chore/spike branches may be pushed to origin

## 2026-02-06 20:42 - Initial project scaffold

- Created monorepo structure: `apps/web`, `apps/api`, `infra`, `docs`, `tasks`
- **Backend** (apps/api): ASP.NET Core Web API (.NET 10)
  - EF Core + PostgreSQL (Npgsql) with initial migration
  - DB models: Users, Roles, Permissions, Locations, AssetTypes, Assets, AssetHistory, AuditLog, CustomFieldDefinitions, CustomFieldValues
  - Endpoints: Health (`/api/v1/health`), Locations CRUD (`/api/v1/locations`), AssetTypes CRUD (`/api/v1/assettypes`)
  - OpenAPI + Scalar API docs
  - CORS configured for frontend dev server
  - Auto-migration on startup in Development mode
- **Frontend** (apps/web): React 19 + TypeScript + Vite 7
  - Tailwind CSS v4 + shadcn/ui (New York style)
  - Shared layout with collapsible sidebar and header
  - Theme toggle: light/dark/system
  - Placeholder pages: Dashboard, Assets, Certificates, Applications/Licences, Locations, Audit Log, Settings
  - DataTable component placeholder (TanStack Table)
  - React Router v7 routing
- **Infrastructure**: Docker Compose with PostgreSQL 16 (persisted volume)
- **Documentation**: setup.md, architecture.md, database.md, api.md, ux-guidelines.md
- **Task tracking**: todo.md, decisions.md, lessons.md
- `.env.example` files for web, api, and infra
- `.gitignore` for the monorepo
