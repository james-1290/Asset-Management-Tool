# QA suites

Three layers, each answering a different question. Run all of them from a clean
database with:

```bash
scripts/qa/full_sweep.sh [label]
```

It wipes the schema, restarts the API so Flyway migrates from scratch, and runs
every suite below, printing a pass/fail line per suite.

| Suite | What it proves | Command |
|---|---|---|
| `scripts/qa/api_smoke.py` | Every one of the 178 endpoints is reachable and answers | `python3 scripts/qa/api_smoke.py` |
| `scripts/qa/api_deep.py` | Every endpoint *behaves*: filters filter, sorts sort, rules hold | `python3 scripts/qa/api_deep.py` |
| `apps/web/e2e/` | The screens people use are wired to all of it | `cd apps/web && npx playwright test` |

All three run in CI on every pull request (`.github/workflows/ci.yml`, the
`e2e` job), which stands up MySQL and MailHog as services, starts the API and
the web app, and uploads logs and traces on failure. Before that job existed the
suites only ran when someone remembered to run them locally.

Prerequisites: Docker infrastructure up, the API on :5115 with
`SPRING_PROFILES_ACTIVE=dev`, and the web app on :5173.

## What the deep API suite covers

Beyond reachability: every filter parameter proved by inclusion *and* exclusion;
every documented sort field checked for real ordering in both directions;
validation and malformed input; lifecycle invariants (check-out/in, retire,
sell, seat limits, safe deletes); all seven custom field types round-tripped;
every dashboard widget and report in JSON and CSV; CSV import validated and
executed; and the full role matrix across Admin, Operator, User, a user with no
role, and anonymous.

## Notes on running it

- **Testcontainers needs `DOCKER_API_VERSION=1.44`** on Docker Engine 29+, which
  rejects the API version docker-java negotiates by default. Without it every
  integration test fails at startup with "Could not find a valid Docker
  environment", which looks like a code failure and is not.
- **The browser suite runs with a single worker,** deliberately. Every spec
  shares one database and several change state that is global to the signed-in
  user (alert settings, saved views, theme). In parallel the suite failed a
  different three tests on each run.
- **`e2e/qa/accessibility.spec.ts`** sweeps every screen for unnamed controls,
  images without alt text, unlabelled fields, and pages without exactly one
  `h1`. It is a floor, not a substitute for testing with real assistive
  technology.
- **The browser suite is run twice** by the sweep: against the Vite dev server,
  and against `vite preview`, which serves the built bundle with the real
  production header suite including the CSP. Only the second would catch a CSP
  that blocks the app in production.

## What these suites do *not* cover

Everything below is untested here because the environment cannot exercise it,
not because it is believed to be broken. Each needs a real Azure tenant.

| Not covered | Why | Where it would be proved |
|---|---|---|
| Slack alert delivery | No webhook endpoint configured; `POST /alerts/test-slack` is only asserted to answer, not to post a message | A workspace webhook in a deployed environment |
| Real Entra sign-in | Local auth goes through the Easy Auth *emulator*; the real platform sidecar, its token store and `/.auth/me` payloads are not exercised | Azure App Service with Easy Auth enabled |
| Entra app-role assignment | Roles come from the emulator's fixed identities, not from a `roles` claim issued by Entra | An app registration with app roles assigned |
| SCIM against real Entra | The SCIM endpoints are tested directly with a bearer token; Entra's own provisioning cycle, retries and payload quirks are not | An enterprise application with provisioning enabled |
| Azure Blob storage | `AzureBlobStorageService` is `@ConditionalOnProperty(app.storage.type=azure-blob)` and needs a managed identity; local runs use `LocalStorageService` | A deployed App Service with a storage account |
| Production TLS/headers at the edge | `vite preview` applies the app's headers, but not Front Door or App Service configuration | The deployed environment |

Email delivery *is* covered: the deep suite records MailHog's message count
before triggering an alert and waits for it to grow, so a passing run means a
message actually arrived rather than that an endpoint returned 200.
