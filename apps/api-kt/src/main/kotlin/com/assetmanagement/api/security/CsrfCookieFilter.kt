package com.assetmanagement.api.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.web.csrf.CsrfToken
import org.springframework.web.filter.OncePerRequestFilter

/**
 * Forces the CSRF token to be materialised on every response so the
 * `XSRF-TOKEN` cookie is actually sent to the browser.
 *
 * Spring Security defers token loading — the cookie is only written if
 * something reads the token during the request. A JSON API renders no templates
 * and therefore never touches it, so without this filter the SPA would never
 * receive a token to echo back.
 */
class CsrfCookieFilter : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        // Reading the value is what triggers the repository to persist it.
        (request.getAttribute(CsrfToken::class.java.name) as? CsrfToken)?.token
        filterChain.doFilter(request, response)
    }
}
