# Deployment (production serving)

The Vite dev server (`npm run dev`) is for local development only. It ships
unminified sources, an open HMR websocket, and sets no Content-Security-Policy
on the app document. **Do not expose it to production.**

## Serving the SPA

The built SPA (`npm run build` → `apps/web/dist/`) is static files served by
nginx. `apps/web/Dockerfile` builds and packages this:

```bash
cd apps/web
docker build -t asset-web .
docker run -p 8080:80 asset-web   # needs the API reachable as host `api:5115`
```

`apps/web/nginx.conf` is the serving config. It:

- Sets the full **security-header suite on every response, including the app
  document** — CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy`, and HSTS. (The API sets its own
  headers on `/api/**`; nginx covers the document the browser loads first.)
- Proxies `/api`, `/saml2`, `/login/saml2`, and `/scim` to the backend, so the
  browser sees a **single origin**. This is what lets the CSP keep
  `connect-src 'self'` — no CORS, no cross-origin allowance.
- Caches hashed `/assets/**` immutably but never caches `index.html`, so a
  deploy doesn't leave clients pinned to a stale bundle.
- Falls back unknown paths to `index.html` (SPA history routing).

Adjust the `upstream asset_api` target in `nginx.conf` for your environment
(default `api:5115`, the docker-compose service name).

## Content-Security-Policy

The policy is tuned to exactly what the built bundle loads:

| Directive | Value | Why |
|-----------|-------|-----|
| `script-src` | `'self'` | Only the app's own hashed bundle. |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` | React inline styles + Tailwind inject `<style>`; Google Fonts CSS. |
| `font-src` | `'self' https://fonts.gstatic.com` | Inter / JetBrains Mono web fonts. |
| `img-src` | `'self' data: blob:` | Avatars, asset-model images, and in-browser PDF/attachment previews use `blob:`/`data:` URLs. |
| `connect-src` | `'self'` | API is same-origin via the nginx proxy. |
| `frame-ancestors` | `'none'` | Clickjacking defence (pairs with `X-Frame-Options: DENY`). |

The same policy is mirrored on `vite preview` (in `vite.config.ts`) so it can be
verified against the real bundle before deploy:

```bash
npm run build && npm run preview   # serves dist/ on :5173 with the prod headers
```

The e2e suite runs against this preview build, so a CSP that breaks the app
fails CI.
