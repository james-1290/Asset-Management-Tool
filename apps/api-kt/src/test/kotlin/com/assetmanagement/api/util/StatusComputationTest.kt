package com.assetmanagement.api.util

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.time.LocalDate

class StatusComputationTest {

    private val todayDate = LocalDate.now(java.time.ZoneOffset.UTC)

    @Test
    fun `non-active status is returned unchanged even when expired`() {
        assertEquals("Revoked", computeStatus("Revoked", todayDate.minusDays(1)))
    }

    @Test
    fun `active with no expiry stays active`() {
        assertEquals("Active", computeStatus("Active", null))
    }

    @Test
    fun `active past expiry becomes Expired`() {
        assertEquals("Expired", computeStatus("Active", todayDate.minusDays(1)))
    }

    @Test
    fun `active within the pending window becomes PendingRenewal`() {
        assertEquals("PendingRenewal", computeStatus("Active", todayDate.plusDays(5)))
    }

    @Test
    fun `active well beyond the window stays Active`() {
        assertEquals("Active", computeStatus("Active", todayDate.plusDays(60)))
    }

    @Test
    fun `custom pendingDays controls the renewal window`() {
        val in20Days = todayDate.plusDays(20)
        assertEquals("Active", computeStatus("Active", in20Days, pendingDays = 10))
        assertEquals("PendingRenewal", computeStatus("Active", in20Days, pendingDays = 30))
    }

    @Test
    fun `daysUntil counts whole calendar days`() {
        assertEquals(0L, daysUntil(todayDate))
        assertEquals(5L, daysUntil(todayDate.plusDays(5)))
        assertEquals(-2L, daysUntil(todayDate.minusDays(2)))
    }
}
