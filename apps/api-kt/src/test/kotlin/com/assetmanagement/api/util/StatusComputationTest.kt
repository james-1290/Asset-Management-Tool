package com.assetmanagement.api.util

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.time.Instant
import java.time.temporal.ChronoUnit

class StatusComputationTest {

    @Test
    fun `non-active status is returned unchanged even when expired`() {
        assertEquals("Revoked", computeStatus("Revoked", Instant.now().minus(1, ChronoUnit.DAYS)))
    }

    @Test
    fun `active with no expiry stays active`() {
        assertEquals("Active", computeStatus("Active", null))
    }

    @Test
    fun `active past expiry becomes Expired`() {
        assertEquals("Expired", computeStatus("Active", Instant.now().minus(1, ChronoUnit.DAYS)))
    }

    @Test
    fun `active within the pending window becomes PendingRenewal`() {
        assertEquals("PendingRenewal", computeStatus("Active", Instant.now().plus(5, ChronoUnit.DAYS)))
    }

    @Test
    fun `active well beyond the window stays Active`() {
        assertEquals("Active", computeStatus("Active", Instant.now().plus(60, ChronoUnit.DAYS)))
    }

    @Test
    fun `custom pendingDays controls the renewal window`() {
        val in20Days = Instant.now().plus(20, ChronoUnit.DAYS)
        assertEquals("Active", computeStatus("Active", in20Days, pendingDays = 10))
        assertEquals("PendingRenewal", computeStatus("Active", in20Days, pendingDays = 30))
    }
}
