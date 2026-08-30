package com.assetmanagement.api.integration

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus

/**
 * Regression guard for the global-search asset counts: the per-location /
 * per-person "N assets" figure must be produced by a grouped COUNT query, not by
 * loading each entity's whole assignedAssets/assets collection. This test just
 * pins the observable behaviour (correct count in the search result) so the
 * optimisation can't silently regress the number.
 */
class SearchCountIntegrationTest : AbstractIntegrationTest() {

    private fun idOf(body: String) =
        Regex("\"id\"\\s*:\\s*\"([0-9a-fA-F-]{36})\"").find(body)!!.groupValues[1]

    @Test
    fun `search reports the active-asset count per location`() {
        val token = loginAsAdmin()
        val tag = System.nanoTime()
        val locName = "SearchLoc-$tag"

        val locId = idOf(postJson("/api/v1/locations", """{"name":"$locName"}""", token).body!!)
        val typeId = idOf(postJson("/api/v1/asset-types", """{"name":"SearchType-$tag"}""", token).body!!)

        // Two non-archived assets in the location.
        repeat(2) { i ->
            val r = postJson(
                "/api/v1/assets",
                """{"name":"SearchAsset-$tag-$i","assetTypeId":"$typeId","locationId":"$locId"}""",
                token,
            )
            assertEquals(HttpStatus.CREATED, r.statusCode, "asset create should succeed: ${r.body}")
        }

        val resp = getAs("/api/v1/search?q=$locName", token)
        assertEquals(HttpStatus.OK, resp.statusCode)
        // The location result should report "2 assets" in its extra field.
        val body = resp.body!!
        assertTrue(body.contains(locName), "search should return the location: $body")
        assertTrue(
            Regex(""""$locName"[^}]*"2 assets"""").containsMatchIn(body) || body.contains("2 assets"),
            "location result should show '2 assets': $body",
        )
    }
}
