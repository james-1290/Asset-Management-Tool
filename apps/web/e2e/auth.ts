import type { Page } from "@playwright/test";

/**
 * Signs in through the same endpoint the app uses in production.
 *
 * On Azure App Service `/.auth/login/aad` is served by the platform's auth
 * sidecar; locally the API emulates it, accepting an `identity` parameter so a
 * test can choose a role. Either way the result is the session cookie the app
 * authenticates with, so these tests exercise the real auth path.
 *
 * The sign-in request goes through `page.request`, which shares the browser
 * context's cookie jar. That leaves the page itself on a single navigation to
 * the app, rather than arriving via the redirect chain — which keeps
 * `waitForLoadState("networkidle")` in the specs meaningful.
 */
export async function signIn(page: Page, identity: "admin" | "operator" | "user" | "norole" = "admin") {
  const res = await page.request.get(
    `/.auth/login/aad?identity=${identity}&post_login_redirect_uri=/`,
    { maxRedirects: 0 }
  );
  if (res.status() !== 302) {
    throw new Error(`Sign-in failed: expected 302 from /.auth/login/aad, got ${res.status()}`);
  }
}

/**
 * POSTs to the API as the signed-in user, echoing the CSRF token the way the
 * app does. Lets a spec create the data it needs instead of depending on
 * whatever happens to be in the developer's database.
 */
export async function apiPost<T = unknown>(page: Page, path: string, body: unknown): Promise<T> {
  // The sign-in endpoint is CSRF-exempt and so issues no token; any ordinary
  // request does. Fetch one first rather than assuming the context already has
  // it — otherwise the very first write in a fresh context is rejected.
  let csrf = (await page.context().cookies()).find((c) => c.name === "XSRF-TOKEN")?.value;
  if (!csrf) {
    await page.request.get("/api/v1/auth/me");
    csrf = (await page.context().cookies()).find((c) => c.name === "XSRF-TOKEN")?.value;
  }
  if (!csrf) throw new Error("no XSRF-TOKEN cookie was issued; is the API running?");

  const res = await page.request.post(`/api/v1${path}`, {
    data: body,
    headers: { "X-XSRF-TOKEN": decodeURIComponent(csrf) },
  });
  if (!res.ok()) {
    throw new Error(`POST ${path} failed: ${res.status()} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}
