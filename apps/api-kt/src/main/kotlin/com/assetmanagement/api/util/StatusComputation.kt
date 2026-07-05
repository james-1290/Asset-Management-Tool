package com.assetmanagement.api.util

import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.Predicate
import jakarta.persistence.criteria.Root
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

/**
 * The Criteria-query counterpart of [computeStatus] for the certificate and
 * application list filters. Both entities store their status as an enum column
 * "status" and an expiry as a date column "expiryDate", so one factory serves
 * both — pass the entity's own [active] / [expired] / [pendingRenewal] enum
 * constants and the [requested] status the caller parsed.
 *
 * Returns the predicates to AND into the caller's spec:
 * - requested == [expired]        → stored Expired, OR Active past its expiry
 * - requested == [pendingRenewal] → stored PendingRenewal, OR Active within [pendingDays]
 * - requested == [active]         → stored Active and not yet Expired/PendingRenewal
 * - anything else                 → a plain equality on [requested]
 */
fun <T> computedStatusPredicates(
    root: Root<T>,
    cb: CriteriaBuilder,
    requested: Enum<*>,
    active: Enum<*>,
    expired: Enum<*>,
    pendingRenewal: Enum<*>,
    pendingDays: Long = 30,
): List<Predicate> {
    val statusPath = root.get<Enum<*>>("status")
    val expiryPath = root.get<LocalDate>("expiryDate")
    val now = today()
    val pendingCutoff = now.plusDays(pendingDays)

    return when (requested) {
        expired -> listOf(
            cb.or(
                cb.equal(statusPath, expired),
                cb.and(
                    cb.equal(statusPath, active),
                    cb.isNotNull(expiryPath),
                    cb.lessThan(expiryPath, now),
                ),
            )
        )
        pendingRenewal -> listOf(
            cb.or(
                cb.equal(statusPath, pendingRenewal),
                cb.and(
                    cb.equal(statusPath, active),
                    cb.isNotNull(expiryPath),
                    cb.greaterThanOrEqualTo(expiryPath, now),
                    cb.lessThan(expiryPath, pendingCutoff),
                ),
            )
        )
        active -> listOf(
            cb.equal(statusPath, active),
            cb.or(
                cb.isNull(expiryPath),
                cb.greaterThanOrEqualTo(expiryPath, pendingCutoff),
            ),
        )
        else -> listOf(cb.equal(statusPath, requested))
    }
}
