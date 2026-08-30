/**
 * Sign-in and sign-out endpoints published by Azure App Service's built-in
 * authentication, and emulated locally by the API so both environments use the
 * same URLs.
 *
 * These are deliberately full-page navigations rather than fetches: the flow
 * leaves the origin for Entra and comes back with a session cookie, which an
 * XHR cannot do.
 */

const LOGIN_ENDPOINT = "/.auth/login/aad";
const LOGOUT_ENDPOINT = "/.auth/logout";

/** Where to send the user back to after sign-in — path only, never absolute. */
function currentPath(): string {
  const { pathname, search } = window.location;
  return `${pathname}${search}` || "/";
}

export function loginUrl(returnTo: string = currentPath()): string {
  return `${LOGIN_ENDPOINT}?post_login_redirect_uri=${encodeURIComponent(returnTo)}`;
}

export function logoutUrl(returnTo = "/"): string {
  return `${LOGOUT_ENDPOINT}?post_logout_redirect_uri=${encodeURIComponent(returnTo)}`;
}

/**
 * Guards against a redirect storm: if several in-flight requests all 401 at
 * once (a session expiring mid-page), only the first navigation is issued.
 */
let redirecting = false;

export function redirectToLogin(returnTo?: string): void {
  if (redirecting) return;
  redirecting = true;
  window.location.assign(loginUrl(returnTo));
}

export function redirectToLogout(): void {
  window.location.assign(logoutUrl());
}
