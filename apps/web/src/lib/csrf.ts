/**
 * CSRF protection for the cookie-authenticated API.
 *
 * Every state-changing request carries a custom header. A cross-origin page
 * cannot set one without a CORS preflight, and the API grants none — so the
 * header is proof the request came from this application, and a forged
 * cross-site request is rejected.
 *
 * This replaced a synchroniser-token cookie, which had a lifecycle problem: the
 * server re-issued a new token on every response, so a page that read the cookie
 * to build a request could find the cookie already replaced by the time the
 * request was sent, and the write was rejected. A constant header cannot rotate,
 * so it cannot race.
 */
const HEADER_NAME = "X-Requested-With";
const HEADER_VALUE = "XMLHttpRequest";

/** Header to attach to every POST/PUT/DELETE. */
export function csrfHeader(): Record<string, string> {
  return { [HEADER_NAME]: HEADER_VALUE };
}
