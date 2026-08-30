/**
 * CSRF token handling for the cookie-authenticated API.
 *
 * The server issues a readable `XSRF-TOKEN` cookie; state-changing requests
 * echo it back in `X-XSRF-TOKEN`. A cross-site attacker can cause the browser
 * to *send* the session cookie, but cannot read this one (same-origin policy)
 * nor set a custom header without a CORS preflight the API refuses — so the
 * echo is what distinguishes our own requests from forged ones.
 */

const COOKIE_NAME = "XSRF-TOKEN";
const HEADER_NAME = "X-XSRF-TOKEN";

export function readCsrfToken(cookieString: string = document.cookie): string | null {
  for (const part of cookieString.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) {
      const raw = rest.join("=");
      if (!raw) return null;
      // Spring writes the token URL-encoded when it contains reserved chars.
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return null;
}

/** Header to attach to POST/PUT/DELETE; empty when no token has been issued yet. */
export function csrfHeader(): Record<string, string> {
  const token = readCsrfToken();
  return token ? { [HEADER_NAME]: token } : {};
}
