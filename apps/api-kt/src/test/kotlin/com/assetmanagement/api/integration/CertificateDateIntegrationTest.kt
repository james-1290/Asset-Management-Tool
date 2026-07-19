package com.assetmanagement.api.integration

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus
import java.time.LocalDate

/**
 * Regression guard for the date-only (LocalDate) certificate fields: exporting
 * and renewing must not format a LocalDate with a time-of-day pattern (which
 * throws UnsupportedTemporalTypeException and broke both endpoints).
 */
class CertificateDateIntegrationTest : AbstractIntegrationTest() {

    private fun idOf(body: String) =
        Regex("\"id\"\\s*:\\s*\"([0-9a-fA-F-]{36})\"").find(body)!!.groupValues[1]

    @Test
    fun `certificate export and renew work for a dated certificate`() {
        val token = loginAsAdmin()

        val typeId = idOf(
            postJson("/api/v1/certificate-types", """{"name":"IT Cert Type ${System.nanoTime()}"}""", token).body!!,
        )
        val certId = idOf(
            postJson(
                "/api/v1/certificates",
                """{"name":"IT Dated Cert","certificateTypeId":"$typeId","status":"Active","issuedDate":"2026-01-15","expiryDate":"2027-01-15"}""",
                token,
            ).body!!,
        )

        // Export must succeed and contain the certificate's date (no time component).
        val export = getWithToken("/api/v1/certificates/export", token)
        assertEquals(HttpStatus.OK, export.statusCode)
        assertTrue(export.body!!.contains("IT Dated Cert"), "export should include the certificate")
        assertTrue(export.body!!.contains("2027-01-15"), "export should render the bare expiry date")

        // Renew must succeed and update the expiry date.
        val renew = postJson("/api/v1/certificates/$certId/renew", """{"newExpiryDate":"2029-06-30"}""", token)
        assertEquals(HttpStatus.OK, renew.statusCode)

        val after = getWithToken("/api/v1/certificates/$certId", token).body!!
        assertTrue(after.contains("\"expiryDate\":\"2029-06-30\""), "renewed expiry should be 2029-06-30")
    }

    @Test
    fun `export renders the date-derived status, not the stored one`() {
        val token = loginAsAdmin()
        val typeId = idOf(
            postJson("/api/v1/certificate-types", """{"name":"Cert Type ${System.nanoTime()}"}""", token).body!!,
        )
        // Stored status is Active, but the expiry is in the past — the computed
        // status is Expired, and the export must reflect that (like the UI does).
        val name = "PastExpiryCert-${System.nanoTime()}"
        val past = LocalDate.now().minusDays(5)
        postJson(
            "/api/v1/certificates",
            """{"name":"$name","certificateTypeId":"$typeId","status":"Active","issuedDate":"${past.minusYears(1)}","expiryDate":"$past"}""",
            token,
        )

        val export = getWithToken("/api/v1/certificates/export", token)
        assertEquals(HttpStatus.OK, export.statusCode)
        val row = export.body!!.lineSequence().first { it.contains(name) }
        assertTrue(row.contains("Expired"), "export row should show computed status Expired: $row")
        assertTrue(!row.contains("Active"), "export row must not show the stored status Active: $row")
    }
}
