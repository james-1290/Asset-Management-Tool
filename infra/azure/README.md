# Azure App Service deployment

The application is designed to run as **one** App Service with Microsoft Entra
sign-in provided by App Service's built-in authentication ("Easy Auth"). The
platform authenticates the user and injects the identity as request headers; the
app reads those headers and holds no signing key, client secret or passwords of
its own.

## 1. Entra app registration

Enabling App Service authentication with the Microsoft provider creates an app
registration (and its enterprise application) for you. Then:

1. **App roles** — define three, with `Value` matching the app's role names
   exactly: `Admin`, `Operator`, `User`. Allowed member types: *Users/Groups*.
2. **Assignment required = Yes** on the enterprise application. Without it, any
   user in the tenant can sign in and be provisioned an account.
3. **Assign your groups** to the app roles (Users and groups → Add user/group).
   Group-based assignment requires **Entra ID P1**.

A user holding no app role is refused by the application with
`403 no_role_assigned` and shown an explanation — they are never silently
admitted with reduced rights.

> The enterprise application created this way comes from an *app registration*
> and therefore does **not** offer the Provisioning (SCIM) blade. That is why
> roles come from app roles rather than SCIM group provisioning — see ADR-014.

## 2. Authentication configuration

`auth.json` here is the file-based Easy Auth configuration. Deploy it to
`/home/site/wwwroot/auth.json` and point the site at it:

```bash
az rest --method PUT \
  --uri "/subscriptions/<SUB>/resourceGroups/<RG>/providers/Microsoft.Web/sites/<APP>/config/authsettingsV2?api-version=2020-09-01" \
  --body '{"properties":{"platform":{"enabled":true,"configFilePath":"/home/site/wwwroot/auth.json"}}}'
```

File-based configuration is required for `excludedPaths`; the portal cannot
express it.

**Two variants are provided:**

| File | `unauthenticatedClientAction` | Behaviour |
|------|-------------------------------|-----------|
| `auth.json` | `AllowAnonymous` | The platform authenticates whoever signs in but gates nothing. The **application** enforces access (it fails closed), returning `401` for an unauthenticated API call, which the SPA turns into a redirect to `/.auth/login/aad`. |
| `auth.require-authentication.json` | `RedirectToLoginPage` | The platform blocks unauthenticated requests before they reach the app. Health and SCIM endpoints must be listed in `excludedPaths` or probes and provisioning break. |

**`auth.json` (AllowAnonymous) is the default and the tested configuration.**
It is the better fit for a single-page app: an expired session yields a clean
`401` that the SPA handles, whereas under `RedirectToLoginPage` a background
`fetch` follows a redirect and receives the sign-in page's HTML where it
expected JSON. The trade-off is that the static bundle is served without
authentication — it contains no data, but choose the gated variant if policy
requires the whole site behind sign-in.

**`tokenStore.enabled` must stay `true`.** Easy Auth's claims mapping — which is
what puts the object id, email, name and `roles` claims into
`X-MS-CLIENT-PRINCIPAL` — depends on the token store.

If the app is fronted by Azure Front Door or Application Gateway, change
`httpSettings.forwardProxy.convention` to `Standard`, or redirects will be
issued against the `*.azurewebsites.net` hostname instead of the public one.

## 3. Application settings

| Setting | Value | Why |
|---------|-------|-----|
| `EASY_AUTH_ENABLED` | `true` | **Required.** The app refuses to start without it outside a dev profile — nothing would authenticate requests. |
| `SPRING_PROFILES_ACTIVE` | *(unset)* | Leave unset in production. Setting `dev`, `test` or `local` relaxes the startup checks. |
| `DB_USERNAME` / `DB_PASSWORD` | Azure Database for MySQL credentials | |
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://<server>.mysql.database.azure.com:3306/assetmgmt?useSSL=true&serverTimezone=UTC` | |
| `CORS_ORIGINS` | The site's own origin | SPA and API share one origin, so this is only a backstop. |
| `SWAGGER_ENABLED` | `false` (default) | The app refuses to start with it enabled outside a dev profile. |
| `SCIM_ENABLED` / `SCIM_BEARER_TOKEN` | only if SCIM is used | Startup fails if SCIM is on with the default token. |
| `RATE_LIMIT_PER_MINUTE` | `120` (default) | Raise only if a legitimate client is being throttled. |
| `UPLOAD_DIR` | see below | |

`EASY_AUTH_LOCAL_EMULATOR` must **never** be set here. The emulator grants
identities without a password; it refuses to start unless a dev/local/test
profile is active, and the startup validator aborts the boot if it is enabled.

## 4. Storage

App Service container storage is **ephemeral** — attachments written to a local
`UPLOAD_DIR` are lost on restart, scale or redeploy. Either set
`WEBSITES_ENABLE_APP_SERVICE_STORAGE=true` and point `UPLOAD_DIR` at a path
under `/home`, or move attachments to Azure Blob Storage.

## 5. Health probes

Point the App Service health check at `/api/v1/health`. The richer probes are
`/actuator/health/liveness` (process alive) and `/actuator/health/readiness`
(app *and* database reachable). All are unauthenticated by design and report
only UP/DOWN — no component detail.
