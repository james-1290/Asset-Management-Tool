package com.assetmanagement.api.integration

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus

/**
 * Seven of the ten collections refused a blank name; three did not, so an unnamed
 * asset type, certificate type or application type could be created and would
 * render as an empty row. Saved views were worse: a blank name, a blank entity
 * type and a `configuration` that was not JSON were all accepted, and the UI
 * parses that field inside a try/catch — so a bad row silently did nothing,
 * forever.
 */
class InputValidationIntegrationTest : AbstractIntegrationTest() {

    private fun refusesBlankName(collection: String, body: String) {
        val response = postJson("/api/v1/$collection", body, loginAsAdmin())
        assertEquals(
            HttpStatus.BAD_REQUEST, response.statusCode,
            "$collection should refuse a blank name: ${response.statusCode} ${response.body}",
        )
    }

    @Test
    fun `asset types refuse a blank name`() = refusesBlankName("asset-types", """{"name":""}""")

    @Test
    fun `certificate types refuse a blank name`() = refusesBlankName("certificate-types", """{"name":""}""")

    @Test
    fun `application types refuse a blank name`() = refusesBlankName("application-types", """{"name":"   "}""")

    @Test
    fun `a name longer than the column is a 400, not a 409`() {
        val long = "L".repeat(300)
        val response = postJson("/api/v1/asset-types", """{"name":"$long"}""", loginAsAdmin())
        assertEquals(
            HttpStatus.BAD_REQUEST, response.statusCode,
            "over-length input is the caller's mistake, not a conflict: ${response.body}",
        )
    }

    @Test
    fun `saved views refuse a configuration that is not JSON`() {
        val session = loginAsAdmin()
        val response = postJson(
            "/api/v1/saved-views",
            """{"entityType":"assets","name":"Bad Config","configuration":"not-json"}""",
            session,
        )
        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode, "got: ${response.body}")
        assertTrue(response.body!!.contains("valid JSON"), "should say why: ${response.body}")
    }

    @Test
    fun `saved views refuse a blank name and a blank entity type`() {
        val session = loginAsAdmin()
        assertEquals(
            HttpStatus.BAD_REQUEST,
            postJson("/api/v1/saved-views", """{"entityType":"assets","name":"","configuration":"{}"}""", session).statusCode,
        )
        assertEquals(
            HttpStatus.BAD_REQUEST,
            postJson("/api/v1/saved-views", """{"entityType":"","name":"x","configuration":"{}"}""", session).statusCode,
        )
    }
}
