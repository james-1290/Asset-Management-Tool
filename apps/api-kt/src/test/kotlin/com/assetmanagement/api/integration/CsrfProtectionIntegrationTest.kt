package com.assetmanagement.api.integration

import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity

/**
 * Authentication moved from a bearer token to the platform's session cookie,
 * which browsers attach to cross-site requests — so CSRF protection is now
 * load-bearing rather than unnecessary.
 *
 * These drive a real cookie session, because that is the only configuration in
 * which CSRF means anything: bearer-token callers are exempt by design.
 */
class CsrfProtectionIntegrationTest : AbstractIntegrationTest() {

    private fun postLocation(headers: HttpHeaders): ResponseEntity<String> {
        headers.contentType = MediaType.APPLICATION_JSON
        return rest.exchange(
            "/api/v1/locations", HttpMethod.POST,
            HttpEntity("""{"name":"CSRF ${System.nanoTime()}"}""", headers), String::class.java
        )
    }

    @Test
    fun `a cookie-authenticated write without the CSRF token is rejected`() {
        val session = signInWithCookie()
        assertNotNull(session.csrfCookie, "expected an XSRF-TOKEN cookie to be issued")

        // Session cookie present, echo header absent — precisely the shape of a
        // cross-site forged request.
        val response = postLocation(session.headers(withCsrf = false))

        // 401 rather than 403 because Spring evaluates CSRF before the
        // authentication filters run, so the rejection is raised against an
        // anonymous context and routed to the authentication entry point. The
        // security property is the same — the write does not happen — and the
        // status is benign in both directions: a genuine forgery gets nothing,
        // while our own SPA hitting a stale token is sent to sign in, which
        // issues a fresh session and token and self-heals.
        assertEquals(HttpStatus.UNAUTHORIZED, response.statusCode, "expected a CSRF rejection, got: ${response.body}")
        assertTrue(!response.statusCode.is2xxSuccessful, "the write must not succeed")
    }

    @Test
    fun `the same write succeeds when the token is echoed back`() {
        val session = signInWithCookie()

        val response = postLocation(session.headers(withCsrf = true))

        assertTrue(
            response.statusCode.is2xxSuccessful,
            "expected the write to succeed with a valid CSRF token, got ${response.statusCode}: ${response.body}"
        )
    }

    @Test
    fun `the CSRF cookie is readable so the SPA can echo it`() {
        val session = signInWithCookie()

        // HttpOnly would make the whole scheme unusable from JavaScript.
        assertTrue(
            !session.csrfCookie!!.contains("HttpOnly", ignoreCase = true),
            "XSRF-TOKEN must not be HttpOnly, was: ${session.csrfCookie}"
        )
    }

    @Test
    fun `reads are unaffected`() {
        val session = signInWithCookie()

        val response = rest.exchange(
            "/api/v1/locations", HttpMethod.GET,
            HttpEntity<Void>(session.headers(withCsrf = false)), String::class.java
        )

        assertTrue(response.statusCode.is2xxSuccessful, "GET should not require a CSRF token, got ${response.statusCode}")
    }

    @Test
    fun `bearer-authenticated requests are exempt, since a custom header cannot be forged cross-site`() {
        val token = loginAsAdmin()

        val response = postJson("/api/v1/locations", """{"name":"CSRF Exempt ${System.nanoTime()}"}""", token)

        assertTrue(
            response.statusCode.is2xxSuccessful,
            "bearer-authenticated POST should not require a CSRF token, got ${response.statusCode}: ${response.body}"
        )
    }
}
