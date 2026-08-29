package com.assetmanagement.api.integration

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus

/**
 * Guards the licence-seat cap: assigning more people than `maxSeats` must be
 * rejected. The assign path takes a pessimistic lock on the application row so
 * concurrent assigns can't over-allocate; this test pins the functional cap.
 */
class SeatAssignmentIntegrationTest : AbstractIntegrationTest() {

    private fun idOf(body: String) =
        Regex("\"id\"\\s*:\\s*\"([0-9a-fA-F-]{36})\"").find(body)!!.groupValues[1]

    @Test
    fun `seat assignment is capped at maxSeats`() {
        val token = loginAsAdmin()
        val tag = System.nanoTime()

        val typeId = idOf(postJson("/api/v1/application-types", """{"name":"AppType-$tag"}""", token).body!!)
        val appId = idOf(
            postJson(
                "/api/v1/applications",
                """{"name":"Capped App $tag","applicationTypeId":"$typeId","maxSeats":1,"status":"Active"}""",
                token,
            ).body!!,
        )
        val p1 = idOf(postJson("/api/v1/people", """{"fullName":"Seat One $tag"}""", token).body!!)
        val p2 = idOf(postJson("/api/v1/people", """{"fullName":"Seat Two $tag"}""", token).body!!)

        // First seat fills the single-seat licence.
        assertEquals(
            HttpStatus.OK,
            postJson("/api/v1/applications/$appId/seats", """{"personId":"$p1"}""", token).statusCode,
            "first seat should be assignable",
        )
        // Second seat exceeds maxSeats=1 → 409.
        assertEquals(
            HttpStatus.CONFLICT,
            postJson("/api/v1/applications/$appId/seats", """{"personId":"$p2"}""", token).statusCode,
            "assigning beyond maxSeats must be rejected",
        )
    }
}
