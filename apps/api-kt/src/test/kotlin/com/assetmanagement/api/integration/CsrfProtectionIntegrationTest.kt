package com.assetmanagement.api.integration

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
 * Authentication is a session cookie, which browsers attach to cross-site
 * requests — so a state-changing request must prove it came from this
 * application. It does that with a custom header, which a cross-origin page
 * cannot set without a CORS preflight this API does not grant.
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
    fun `a cookie-authenticated write without the custom header is rejected`() {
        val session = signInWithCookie()

        // Session cookie present, custom header absent — exactly the shape of a
        // cross-site forged request.
        val response = postLocation(session.headers(withCsrf = false))

        assertEquals(HttpStatus.FORBIDDEN, response.statusCode, "expected a CSRF rejection, got: ${response.body}")
        assertTrue(
            response.body!!.contains("csrf_header_missing"),
            "the rejection should say why: ${response.body}"
        )
    }

    @Test
    fun `the same write succeeds with the custom header`() {
        val session = signInWithCookie()

        val response = postLocation(session.headers(withCsrf = true))

        assertTrue(
            response.statusCode.is2xxSuccessful,
            "expected the write to succeed, got ${response.statusCode}: ${response.body}"
        )
    }

    @Test
    fun `reads are unaffected`() {
        val session = signInWithCookie()

        val response = rest.exchange(
            "/api/v1/locations", HttpMethod.GET,
            HttpEntity<Void>(session.headers(withCsrf = false)), String::class.java
        )

        assertTrue(response.statusCode.is2xxSuccessful, "GET should not require the header, got ${response.statusCode}")
    }

    @Test
    fun `the protection cannot go stale, unlike a rotating token`() {
        val session = signInWithCookie()

        // Twenty writes in a row with the same constant header. A synchroniser
        // token that the server re-issued per response would start failing here;
        // a constant header cannot.
        repeat(20) { i ->
            val response = postLocation(session.headers(withCsrf = true))
            assertTrue(
                response.statusCode.is2xxSuccessful,
                "write $i should still succeed, got ${response.statusCode}: ${response.body}"
            )
        }
    }

    @Test
    fun `bearer-authenticated requests are exempt, since they do not use the cookie`() {
        val token = loginAsAdmin()

        val response = postJson("/api/v1/locations", """{"name":"CSRF Exempt ${System.nanoTime()}"}""", token)

        assertTrue(
            response.statusCode.is2xxSuccessful,
            "bearer-authenticated POST should not require the header, got ${response.statusCode}: ${response.body}"
        )
    }
}
