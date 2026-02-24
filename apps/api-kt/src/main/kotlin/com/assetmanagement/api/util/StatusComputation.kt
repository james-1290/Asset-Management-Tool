package com.assetmanagement.api.util

import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * Computes a display status based on the stored status and expiry date.
 * - Active + expiryDate in the past → Expired
 * - Active + expiryDate within [pendingDays] days → PendingRenewal
 * - Otherwise → stored status as-is
 */
fun computeStatus(storedStatus: String, expiryDate: Instant?, pendingDays: Long = 30): String {
    if (storedStatus != "Active" || expiryDate == null) return storedStatus
    val now = Instant.now()
    if (expiryDate.isBefore(now)) return "Expired"
    if (expiryDate.isBefore(now.plus(pendingDays, ChronoUnit.DAYS))) return "PendingRenewal"
    return storedStatus
}
