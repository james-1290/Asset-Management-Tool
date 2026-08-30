package com.assetmanagement.api.integration

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Test
import org.springframework.http.HttpEntity
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus

/**
 * An unmatched path used to fall through to the generic exception handler and
 * be reported as `500 An internal error occurred`, with a stack trace logged as
 * "Unhandled exception" — for something as ordinary as a browser requesting
 * `/favicon.ico`, or a signed-in user landing on `/` where this API serves no
 * page.
 */
class NotFoundIntegrationTest : AbstractIntegrationTest() {

    @Test
    fun `an unknown path returns 404, not a 500 internal error`() {
        val session = signInWithCookie()

        for (path in listOf("/", "/favicon.ico", "/api/v1/does-not-exist")) {
            val response = rest.exchange(
                path, HttpMethod.GET, HttpEntity<Void>(session.headers()), String::class.java
            )
            assertEquals(HttpStatus.NOT_FOUND, response.statusCode, "$path should be 404, was ${response.statusCode}")
            assertFalse(
                response.body?.contains("internal error") == true,
                "$path must not report an internal error: ${response.body}"
            )
        }
    }
}
