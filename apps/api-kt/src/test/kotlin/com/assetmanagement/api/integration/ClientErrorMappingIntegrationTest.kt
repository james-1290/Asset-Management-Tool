package com.assetmanagement.api.integration

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType

/**
 * Client mistakes must be reported as client errors.
 *
 * Using the wrong verb on a real path, or the wrong content type, fell through
 * to the catch-all handler: every one answered 500 "An internal error occurred"
 * and logged a stack trace with an error id. That is the wrong status for the
 * caller, and it buries genuine server faults in noise — the same trap that had
 * already been fixed once for unknown paths.
 */
class ClientErrorMappingIntegrationTest : AbstractIntegrationTest() {

    @Test
    fun `the wrong verb on a real path is 405, not 500`() {
        val session = loginAsAdmin()
        val response = rest.exchange(
            "/api/v1/assets", HttpMethod.DELETE,
            HttpEntity<Void>(session.headers()), String::class.java,
        )

        assertEquals(405, response.statusCode.value(), "expected Method Not Allowed, got: ${response.body}")
        val allow = response.headers.getFirst(HttpHeaders.ALLOW).orEmpty()
        assertTrue(allow.contains("GET"), "the Allow header should name the valid methods, got '$allow'")
    }

    @Test
    fun `an unsupported content type is 415, not 500`() {
        val session = loginAsAdmin()
        val headers = session.headers().apply { contentType = MediaType.TEXT_PLAIN }
        val response = rest.exchange(
            "/api/v1/assets", HttpMethod.POST,
            HttpEntity("not json", headers), String::class.java,
        )

        assertEquals(415, response.statusCode.value(), "expected Unsupported Media Type, got: ${response.body}")
    }

    @Test
    fun `an unknown path is still 404`() {
        val response = getAs("/api/v1/no-such-collection", loginAsAdmin())
        assertEquals(404, response.statusCode.value(), "got: ${response.body}")
    }
}
