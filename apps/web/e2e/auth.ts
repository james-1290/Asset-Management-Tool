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
