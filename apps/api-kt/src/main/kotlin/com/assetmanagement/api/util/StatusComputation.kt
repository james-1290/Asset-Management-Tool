package com.assetmanagement.api.util

import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.Predicate
import jakarta.persistence.criteria.Root
import org.springframework.data.jpa.domain.Specification
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit
import java.util.UUID

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

/**
 * A `Specification` that orders certificates and applications by the status the
 * list actually shows.
 *
 * Both entities display a *computed* status ([computeStatus]) — a stored `Active`
 * row reads as `Expired` or `PendingRenewal` once its expiry date comes into
 * range — but the stored column still says `Active`. Ordering on that column
 * therefore produces an order the user cannot see any logic in: an item shown as
 * `PendingRenewal` sorts among the `Active` ones. The status *filter* already
 * accounts for this (see [computedStatusPredicates]); this is its ordering
 * counterpart, so the two agree.
 *
 * The rank is the alphabetical position of the computed status name, matching how
 * the column reads on screen. Pass an unsorted `Pageable` when using this, or
 * Spring Data's own `Sort` will be appended ahead of it.
 */
fun <T> orderByComputedStatus(
    statuses: List<Enum<*>>,
    active: Enum<*>,
    expired: Enum<*>,
    pendingRenewal: Enum<*>,
    descending: Boolean,
    pendingDays: Long = 30,
): Specification<T> = Specification { root, query, cb ->
    // Ordering is meaningless on the count query, and Hibernate rejects it there.
    val resultType = query?.resultType
    if (query == null || resultType == java.lang.Long::class.java || resultType == java.lang.Long.TYPE) {
        return@Specification null
    }

    val rank = statuses.map { it.name }.sorted()
        .withIndex().associate { (index, name) -> name to index }
    val statusPath = root.get<Enum<*>>("status")
    val expiryPath = root.get<LocalDate>("expiryDate")
    val now = today()
    val pendingCutoff = now.plusDays(pendingDays)

    val case = cb.selectCase<Int>()
        // A stored-Active row takes the rank of whatever it computes to.
        .`when`(
            cb.and(
                cb.equal(statusPath, active),
                cb.isNotNull(expiryPath),
                cb.lessThan(expiryPath, now),
            ),
            rank.getValue(expired.name),
        )
        .`when`(
            cb.and(
                cb.equal(statusPath, active),
                cb.isNotNull(expiryPath),
                cb.greaterThanOrEqualTo(expiryPath, now),
                cb.lessThan(expiryPath, pendingCutoff),
            ),
            rank.getValue(pendingRenewal.name),
        )

    // Every other stored status ranks as itself.
    val ranked = statuses.fold(case) { acc, status ->
        acc.`when`(cb.equal(statusPath, status), rank.getValue(status.name))
    }.otherwise(rank.size)

    query.orderBy(
        if (descending) cb.desc(ranked) else cb.asc(ranked),
        // A stable tiebreak, so paging through equal statuses can't repeat a row.
        cb.asc(root.get<UUID>("id")),
    )
    null // contributes no predicate
}
