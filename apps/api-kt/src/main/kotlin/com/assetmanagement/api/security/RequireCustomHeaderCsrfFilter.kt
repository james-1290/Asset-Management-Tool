package com.assetmanagement.api.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.web.filter.OncePerRequestFilter

/**
 * CSRF protection by required custom header.
 *
 * Authentication is a session cookie (Azure App Service built-in auth), which
 * browsers attach to cross-site requests — so state-changing requests need
 * proof they came from our own page. A **custom request header** is that proof:
 * a cross-origin page cannot set one without a CORS preflight, and this API
 * grants none (`allowCredentials = false`, and no foreign origin is allowed).
 * The OWASP CSRF guidance lists this as a complete defence for APIs.
 *
 * It is used here in preference to a synchroniser token because the token has a
 * lifecycle and this does not. Spring's cookie token repository re-issued a new
 * token on every response in this application, and a rotating token is actively
 * harmful to a single-page app: the page reads `XSRF-TOKEN` to build a write,
 * another in-flight response replaces the cookie, the browser then sends the new
 * cookie with the old header, and the write is rejected. Users saw unexplained
 * "Access denied" errors on save. Nothing here can rotate, so nothing can race.
 *
 * The session cookie is `SameSite=Lax`, which already blocks cross-site form
 * posts; this is the second layer rather than the only one.
 */
class RequireCustomHeaderCsrfFilter : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        if (requiresProtection(request) && request.getHeader(HEADER) == null) {
            response.status = HttpServletResponse.SC_FORBIDDEN
            response.contentType = "application/json"
            response.writer.write(
                """{"error":"Missing $HEADER header. This request was rejected as a possible cross-site request forgery.","code":"csrf_header_missing"}"""
            )
            return
        }
        filterChain.doFilter(request, response)
    }

    private fun requiresProtection(request: HttpServletRequest): Boolean {
        if (request.method in SAFE_METHODS) return false

        // Bearer-authenticated callers (SCIM) don't use the cookie, so they
        // cannot be the target of a forged browser request.
        if (request.getHeader("Authorization")?.startsWith("Bearer ") == true) return false

        // The platform's own sign-in/sign-out endpoints carry no application
        // state; on App Service they never reach this container at all.
        if (request.requestURI.startsWith("/.auth/")) return false

        return true
    }

    private companion object {
        const val HEADER = "X-Requested-With"
        val SAFE_METHODS = setOf("GET", "HEAD", "OPTIONS", "TRACE")
    }
}
