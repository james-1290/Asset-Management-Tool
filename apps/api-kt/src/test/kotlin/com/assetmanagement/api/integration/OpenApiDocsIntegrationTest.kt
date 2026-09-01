package com.assetmanagement.api.integration

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus
import org.springframework.test.context.TestPropertySource

/**
 * The generated OpenAPI spec is served only when `SWAGGER_ENABLED` is set, which
 * it is not by default. That left springdoc entirely unexercised: the Spring
 * Boot 4 upgrade broke it — the app booted and the routes registered, but
 * building the spec threw — and no suite noticed, because every suite runs with
 * the docs switched off.
 *
 * This turns them on for one test so the spec is actually built on every run.
 */
@TestPropertySource(properties = ["springdoc.api-docs.enabled=true", "springdoc.swagger-ui.enabled=true"])
class OpenApiDocsIntegrationTest : AbstractIntegrationTest() {

    @Test
    fun `the OpenAPI spec builds and documents the API`() {
        val session = loginAsAdmin()
        val response = getAs("/v3/api-docs", session)

        assertEquals(HttpStatus.OK, response.statusCode, "spec should be served: ${response.body}")
        val body = response.body!!
        // A spec that builds but documents nothing would pass a status check.
        assertTrue(body.contains("\"openapi\""), "should be an OpenAPI document, got: ${body.take(200)}")
        assertTrue(
            body.contains("/api/v1/assets") && body.contains("/api/v1/certificates"),
            "spec should document the API's own paths",
        )
    }
}
