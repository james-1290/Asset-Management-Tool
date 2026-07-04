package com.assetmanagement.api.util

import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.temporal.ChronoUnit

data class Depreciation(
    val monthly: BigDecimal?,
    val total: BigDecimal?,
    val bookValue: BigDecimal?
)

/**
 * Straight-line depreciation, computed consistently to 2dp everywhere.
 * (Previously the DTO used scale-2 while the depreciation report used scale-4,
 * so book values disagreed between the detail view and the report.)
 */
object DepreciationCalculator {
    private val DAYS_PER_MONTH = BigDecimal("30.44")

    fun compute(
        cost: BigDecimal?,
        months: Int?,
        purchaseDate: Instant?,
        asOf: Instant = Instant.now()
    ): Depreciation {
        if (cost == null || months == null || months <= 0) return Depreciation(null, null, null)

        val monthly = cost.divide(BigDecimal(months), 2, RoundingMode.HALF_UP)
        if (purchaseDate == null) {
            return Depreciation(monthly, BigDecimal.ZERO.setScale(2), cost.setScale(2, RoundingMode.HALF_UP))
        }
        val elapsedMonths = ChronoUnit.DAYS.between(purchaseDate, asOf).toBigDecimal()
            .divide(DAYS_PER_MONTH, 0, RoundingMode.FLOOR).toLong().coerceIn(0, months.toLong())
        val total = (monthly * BigDecimal(elapsedMonths)).setScale(2, RoundingMode.HALF_UP)
        val bookValue = (cost - total).coerceAtLeast(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP)
        return Depreciation(monthly, total, bookValue)
    }
}
