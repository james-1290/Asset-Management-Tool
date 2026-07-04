package com.assetmanagement.api.util

import java.time.LocalDate
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit

/** Today's calendar date in UTC — the reference point for all date-only comparisons. */
fun today(): LocalDate = LocalDate.now(ZoneOffset.UTC)

/**
 * Whole calendar days from today until [date] (negative if [date] is in the past).
 * Date-only, so it never truncates a partial day the way `Instant`-based
 * `ChronoUnit.DAYS.between(now, …)` did.
 */
fun daysUntil(date: LocalDate, from: LocalDate = today()): Long =
    ChronoUnit.DAYS.between(from, date)

/**
 * Computes a display status based on the stored status and expiry date.
 * - Active + expiryDate before today → Expired
 * - Active + expiryDate within [pendingDays] days → PendingRenewal
 * - Otherwise → stored status as-is
 */
fun computeStatus(storedStatus: String, expiryDate: LocalDate?, pendingDays: Long = 30): String {
    if (storedStatus != "Active" || expiryDate == null) return storedStatus
    val today = today()
    if (expiryDate.isBefore(today)) return "Expired"
    if (expiryDate.isBefore(today.plusDays(pendingDays))) return "PendingRenewal"
    return storedStatus
}
