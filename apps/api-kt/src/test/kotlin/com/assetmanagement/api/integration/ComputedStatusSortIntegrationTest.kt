package com.assetmanagement.api.integration

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus
import java.time.LocalDate

/**
 * Regression guard for sorting by "Status" on certificates and applications.
 *
 * Both list a *computed* status — a stored `Active` row reads as `Expired` or
 * `PendingRenewal` once its expiry comes into range — so ordering by the stored
 * column produced an order with no visible logic: a row shown as
 * `PendingRenewal` sorted in among the `Active` ones, and asc and desc returned
 * the same sequence. The status filter was already computed-aware; the sort was
 * not.
 */
class ComputedStatusSortIntegrationTest : AbstractIntegrationTest() {

    private fun idOf(body: String) =
        Regex("\"id\"\\s*:\\s*\"([0-9a-fA-F-]{36})\"").find(body)!!.groupValues[1]

    /** The `status` values of a list response, in the order the API returned them. */
    private fun statuses(body: String): List<String> =
        Regex("\"status\"\\s*:\\s*\"([A-Za-z]+)\"").findAll(body).map { it.groupValues[1] }.toList()

    @Test
    fun `certificates sort by the status they display, not the one they store`() {
        val token = loginAsAdmin()
        val typeId = idOf(
            postJson("/api/v1/certificate-types", """{"name":"Sort Cert Type ${System.nanoTime()}"}""", token).body!!,
        )
        val today = LocalDate.now()
        // All three are stored Active; only their expiry dates differ, so each
        // computes to a different displayed status.
        val cases = listOf(
            "SortCertExpired-${System.nanoTime()}" to today.minusDays(10),   // -> Expired
            "SortCertPending-${System.nanoTime()}" to today.plusDays(10),    // -> PendingRenewal
            "SortCertActive-${System.nanoTime()}" to today.plusYears(5),     // -> Active
        )
        cases.forEach { (name, expiry) ->
            postJson(
                "/api/v1/certificates",
                """{"name":"$name","certificateTypeId":"$typeId","status":"Active","expiryDate":"$expiry"}""",
                token,
            )
        }

        val asc = getAs("/api/v1/certificates?pageSize=100&sortBy=status&sortDir=asc", token)
        assertEquals(HttpStatus.OK, asc.statusCode)
        val ascStatuses = statuses(asc.body!!)
        assertTrue(
            ascStatuses == ascStatuses.sorted(),
            "ascending status order should be sorted, was $ascStatuses",
        )

        val desc = getAs("/api/v1/certificates?pageSize=100&sortBy=status&sortDir=desc", token)
        val descStatuses = statuses(desc.body!!)
        assertTrue(
            descStatuses == descStatuses.sortedDescending(),
            "descending status order should be reverse-sorted, was $descStatuses",
        )
        // The bug made both directions identical; they must now differ.
        assertTrue(
            ascStatuses.first() != descStatuses.first(),
            "asc and desc must not return the same order ($ascStatuses)",
        )
    }

    @Test
    fun `applications sort by the status they display, not the one they store`() {
        val token = loginAsAdmin()
        val typeId = idOf(
            postJson("/api/v1/application-types", """{"name":"Sort App Type ${System.nanoTime()}"}""", token).body!!,
        )
        val today = LocalDate.now()
        val cases = listOf(
            "SortAppExpired-${System.nanoTime()}" to today.minusDays(10),
            "SortAppPending-${System.nanoTime()}" to today.plusDays(10),
            "SortAppActive-${System.nanoTime()}" to today.plusYears(5),
        )
        cases.forEach { (name, expiry) ->
            postJson(
                "/api/v1/applications",
                """{"name":"$name","applicationTypeId":"$typeId","status":"Active","expiryDate":"$expiry"}""",
                token,
            )
        }

        val asc = getAs("/api/v1/applications?pageSize=100&sortBy=status&sortDir=asc", token)
        assertEquals(HttpStatus.OK, asc.statusCode)
        val ascStatuses = statuses(asc.body!!)
        assertTrue(
            ascStatuses == ascStatuses.sorted(),
            "ascending status order should be sorted, was $ascStatuses",
        )

        val desc = getAs("/api/v1/applications?pageSize=100&sortBy=status&sortDir=desc", token)
        val descStatuses = statuses(desc.body!!)
        assertTrue(
            descStatuses == descStatuses.sortedDescending(),
            "descending status order should be reverse-sorted, was $descStatuses",
        )
    }
}
