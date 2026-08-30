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
  const res = await page.request.post(`/api/v1${path}`, {
    data: body,
    // The custom header the API requires on state-changing requests.
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });
  if (!res.ok()) {
    throw new Error(`POST ${path} failed: ${res.status()} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/**
 * A unique suffix for test fixture names.
 *
 * `Date.now()` alone is not enough: specs run in parallel workers and two of
 * them can land in the same millisecond, then collide on a unique constraint —
 * an intermittent 409 that looks like an application fault but is the test's
 * own doing.
 */
export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
