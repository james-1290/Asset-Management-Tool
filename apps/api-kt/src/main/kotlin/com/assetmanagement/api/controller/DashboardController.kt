package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.enums.AssetStatus
import com.assetmanagement.api.model.enums.CertificateStatus
import com.assetmanagement.api.model.enums.ApplicationStatus
import jakarta.persistence.EntityManager
import jakarta.persistence.Tuple
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.*

@RestController
@RequestMapping("/api/v1/dashboard")
class DashboardController(
    private val em: EntityManager
) {

    // 1. GET /summary - totalAssets + totalValue
    @GetMapping("/summary")
    fun getSummary(): ResponseEntity<DashboardSummaryDto> {
        val totalAssets = em.createQuery(
            "SELECT COUNT(a) FROM Asset a WHERE a.isArchived = false", java.lang.Long::class.java
        ).singleResult.toInt()

        val totalValue = em.createQuery(
            "SELECT COALESCE(SUM(a.purchaseCost), 0) FROM Asset a WHERE a.isArchived = false",
            BigDecimal::class.java
        ).singleResult ?: BigDecimal.ZERO

        // Compute total book value (purchase cost minus straight-line depreciation)
        @Suppress("UNCHECKED_CAST")
        val depreciableAssets = em.createQuery(
            """SELECT a.purchaseCost, a.purchaseDate, a.depreciationMonths
               FROM com.assetmanagement.api.model.Asset a
               WHERE a.isArchived = false
               AND a.purchaseCost IS NOT NULL
               AND a.purchaseDate IS NOT NULL"""
        ).resultList as List<Array<Any>>

        val now = Instant.now()
        var totalBookValue = BigDecimal.ZERO
        for (row in depreciableAssets) {
            val cost = row[0] as BigDecimal
            val purchaseDate = row[1] as Instant
            val months = row[2] as? Int

            if (months != null && months > 0) {
                val monthly = cost.divide(BigDecimal(months), 2, RoundingMode.HALF_UP)
                val elapsed = ChronoUnit.DAYS.between(purchaseDate, now).toBigDecimal()
                    .divide(BigDecimal("30.44"), 0, RoundingMode.FLOOR).toLong().coerceIn(0, months.toLong())
                val totalDepr = (monthly * BigDecimal(elapsed)).setScale(2, RoundingMode.HALF_UP)
                totalBookValue += (cost - totalDepr).coerceAtLeast(BigDecimal.ZERO)
            } else {
                totalBookValue += cost
            }
        }

        return ResponseEntity.ok(DashboardSummaryDto(totalAssets, totalValue, totalBookValue.setScale(2, RoundingMode.HALF_UP)))
    }

    // 2. GET /status-breakdown - group by AssetStatus
    @GetMapping("/status-breakdown")
    fun getStatusBreakdown(): ResponseEntity<List<StatusBreakdownItemDto>> {
        @Suppress("UNCHECKED_CAST")
        val results = em.createQuery(
            "SELECT a.status, COUNT(a) FROM Asset a WHERE a.isArchived = false GROUP BY a.status"
        ).resultList as List<Array<Any>>

        val items = results.map { row ->
            StatusBreakdownItemDto(
                status = (row[0] as AssetStatus).name,
                count = (row[1] as Long).toInt()
            )
        }
        return ResponseEntity.ok(items)
    }

    // 3. GET /warranty-expiries?days=30
    @GetMapping("/warranty-expiries")
    fun getWarrantyExpiries(
        @RequestParam(defaultValue = "30") days: Int
    ): ResponseEntity<List<WarrantyExpiryItemDto>> {
        val now = Instant.now()
        val cutoff = now.plus(days.toLong(), ChronoUnit.DAYS)

        @Suppress("UNCHECKED_CAST")
        val results = em.createQuery(
            """SELECT a FROM com.assetmanagement.api.model.Asset a
               LEFT JOIN FETCH a.assetType
               WHERE a.isArchived = false
               AND a.warrantyExpiryDate IS NOT NULL
               AND a.warrantyExpiryDate > :now
               AND a.warrantyExpiryDate <= :cutoff
               ORDER BY a.warrantyExpiryDate ASC"""
        ).setParameter("now", now)
         .setParameter("cutoff", cutoff)
         .resultList as List<com.assetmanagement.api.model.Asset>

        val items = results.map { a ->
            WarrantyExpiryItemDto(
                id = a.id,
                name = a.name,
                assetTag = a.assetTag,
                assetTypeName = a.assetType?.name ?: "",
                warrantyExpiryDate = a.warrantyExpiryDate!!,
                daysUntilExpiry = ChronoUnit.DAYS.between(now, a.warrantyExpiryDate!!).toInt()
            )
        }
        return ResponseEntity.ok(items)
    }

    // 4. GET /assets-by-type - count by asset type
    @GetMapping("/assets-by-type")
    fun getAssetsByType(): ResponseEntity<List<AssetsByGroupItemDto>> {
        @Suppress("UNCHECKED_CAST")
        val results = em.createQuery(
            """SELECT t.name, COUNT(a) FROM com.assetmanagement.api.model.Asset a
               JOIN a.assetType t
               WHERE a.isArchived = false
               GROUP BY t.name
               ORDER BY COUNT(a) DESC"""
        ).resultList as List<Array<Any>>

        val items = results.map { row ->
            AssetsByGroupItemDto(
                label = row[0] as String,
                count = (row[1] as Long).toInt()
            )
        }
        return ResponseEntity.ok(items)
    }

    // 5. GET /assets-by-location - count by location
    @GetMapping("/assets-by-location")
    fun getAssetsByLocation(): ResponseEntity<List<AssetsByGroupItemDto>> {
        @Suppress("UNCHECKED_CAST")
        val results = em.createQuery(
            """SELECT COALESCE(l.name, 'Unassigned'), COUNT(a)
               FROM com.assetmanagement.api.model.Asset a
               LEFT JOIN a.location l
               WHERE a.isArchived = false
               GROUP BY l.name
               ORDER BY COUNT(a) DESC"""
        ).resultList as List<Array<Any>>

        val items = results.map { row ->
            AssetsByGroupItemDto(
                label = row[0] as String,
                count = (row[1] as Long).toInt()
            )
        }
        return ResponseEntity.ok(items)
    }

    // 6. GET /checked-out - checked out assets with assigned person
    @GetMapping("/checked-out")
    fun getCheckedOut(): ResponseEntity<List<CheckedOutAssetDto>> {
        @Suppress("UNCHECKED_CAST")
        val results = em.createQuery(
            """SELECT a FROM com.assetmanagement.api.model.Asset a
               LEFT JOIN FETCH a.assignedPerson
               WHERE a.isArchived = false
               AND a.status = :status
               ORDER BY a.updatedAt DESC"""
        ).setParameter("status", AssetStatus.CheckedOut)
         .resultList as List<com.assetmanagement.api.model.Asset>

        val items = results.map { a ->
            CheckedOutAssetDto(
                id = a.id,
                name = a.name,
                assetTag = a.assetTag,
                assignedPersonName = a.assignedPerson?.fullName,
                updatedAt = a.updatedAt
            )
        }
        return ResponseEntity.ok(items)
    }

    // 7. GET /recently-added?limit=5
    @GetMapping("/recently-added")
    fun getRecentlyAdded(
        @RequestParam(defaultValue = "5") limit: Int
    ): ResponseEntity<List<RecentlyAddedAssetDto>> {
        val safeLimit = limit.coerceIn(1, 50)

        @Suppress("UNCHECKED_CAST")
        val results = em.createQuery(
            """SELECT a FROM com.assetmanagement.api.model.Asset a
               LEFT JOIN FETCH a.assetType
               WHERE a.isArchived = false
               ORDER BY a.createdAt DESC"""
        ).setMaxResults(safeLimit)
         .resultList as List<com.assetmanagement.api.model.Asset>

        val items = results.map { a ->
            RecentlyAddedAssetDto(
                id = a.id,
                name = a.name,
                assetTag = a.assetTag,
                assetTypeName = a.assetType?.name ?: "",
                createdAt = a.createdAt
            )
        }
        return ResponseEntity.ok(items)
    }

    // 8. GET /assets-by-age - age buckets (<1yr, 1-3yr, 3-5yr, 5+yr)
    @GetMapping("/assets-by-age")
    fun getAssetsByAge(): ResponseEntity<List<AssetsByAgeBucketDto>> {
        @Suppress("UNCHECKED_CAST")
        val assets = em.createQuery(
            """SELECT a.purchaseDate FROM com.assetmanagement.api.model.Asset a
               WHERE a.isArchived = false AND a.purchaseDate IS NOT NULL"""
        ).resultList as List<Instant>

        val now = Instant.now()
        var lessThan1 = 0
        var oneToThree = 0
        var threeToFive = 0
        var fivePlus = 0

        assets.forEach { purchaseDate ->
            val days = ChronoUnit.DAYS.between(purchaseDate, now)
            when {
                days < 365 -> lessThan1++
                days < 365 * 3 -> oneToThree++
                days < 365 * 5 -> threeToFive++
                else -> fivePlus++
            }
        }

        val buckets = listOf(
            AssetsByAgeBucketDto("< 1 Year", lessThan1),
            AssetsByAgeBucketDto("1-3 Years", oneToThree),
            AssetsByAgeBucketDto("3-5 Years", threeToFive),
            AssetsByAgeBucketDto("5+ Years", fivePlus)
        )
        return ResponseEntity.ok(buckets)
    }

    // 9. GET /unassigned - available with no person
    @GetMapping("/unassigned")
    fun getUnassigned(): ResponseEntity<List<UnassignedAssetDto>> {
        @Suppress("UNCHECKED_CAST")
        val results = em.createQuery(
            """SELECT a FROM com.assetmanagement.api.model.Asset a
               LEFT JOIN FETCH a.assetType
               WHERE a.isArchived = false
               AND a.status = :status
               AND a.assignedPersonId IS NULL
               ORDER BY a.name ASC"""
        ).setParameter("status", AssetStatus.Available)
         .resultList as List<com.assetmanagement.api.model.Asset>

        val items = results.map { a ->
            UnassignedAssetDto(
                id = a.id,
                name = a.name,
                assetTag = a.assetTag,
                assetTypeName = a.assetType?.name ?: ""
            )
        }
        return ResponseEntity.ok(items)
    }

    // 10. GET /value-by-location - sum purchaseCost by location
    @GetMapping("/value-by-location")
    fun getValueByLocation(): ResponseEntity<List<ValueByLocationDto>> {
        @Suppress("UNCHECKED_CAST")
        val results = em.createQuery(
            """SELECT COALESCE(l.name, 'Unassigned'), COALESCE(SUM(a.purchaseCost), 0)
               FROM com.assetmanagement.api.model.Asset a
               LEFT JOIN a.location l
               WHERE a.isArchived = false
               GROUP BY l.name
               ORDER BY SUM(a.purchaseCost) DESC"""
        ).resultList as List<Array<Any>>

        val items = results.map { row ->
            ValueByLocationDto(
                locationName = row[0] as String,
                totalValue = row[1] as BigDecimal
            )
        }
        return ResponseEntity.ok(items)
    }

    // 11. GET /certificate-expiries?days=30
    @GetMapping("/certificate-expiries")
    fun getCertificateExpiries(
        @RequestParam(defaultValue = "30") days: Int
    ): ResponseEntity<List<CertificateExpiryItemDto>> {
        val now = Instant.now()
        val cutoff = now.plus(days.toLong(), ChronoUnit.DAYS)

        @Suppress("UNCHECKED_CAST")
        val results = em.createQuery(
            """SELECT c FROM com.assetmanagement.api.model.Certificate c
               LEFT JOIN FETCH c.certificateType
               WHERE c.isArchived = false
               AND c.expiryDate IS NOT NULL
               AND c.expiryDate > :now
               AND c.expiryDate <= :cutoff
               ORDER BY c.expiryDate ASC"""
        ).setParameter("now", now)
         .setParameter("cutoff", cutoff)
         .resultList as List<com.assetmanagement.api.model.Certificate>

        val items = results.map { c ->
            CertificateExpiryItemDto(
                id = c.id,
                name = c.name,
                certificateTypeName = c.certificateType?.name ?: "",
                expiryDate = c.expiryDate!!,
                daysUntilExpiry = ChronoUnit.DAYS.between(now, c.expiryDate!!).toInt(),
                status = c.status.name
            )
        }
        return ResponseEntity.ok(items)
    }

    // 12. GET /certificate-summary - count by CertificateStatus
    @GetMapping("/certificate-summary")
    fun getCertificateSummary(): ResponseEntity<CertificateSummaryDto> {
        @Suppress("UNCHECKED_CAST")
        val results = em.createQuery(
            """SELECT c.status, COUNT(c) FROM com.assetmanagement.api.model.Certificate c
               WHERE c.isArchived = false
               GROUP BY c.status"""
        ).resultList as List<Array<Any>>

        val statusMap = results.associate { row ->
            (row[0] as CertificateStatus).name to (row[1] as Long).toInt()
        }

        val total = statusMap.values.sum()
        return ResponseEntity.ok(
            CertificateSummaryDto(
                totalCertificates = total,
                active = statusMap["Active"] ?: 0,
                expired = statusMap["Expired"] ?: 0,
                pendingRenewal = statusMap["PendingRenewal"] ?: 0,
                revoked = statusMap["Revoked"] ?: 0
            )
        )
    }

    // 13. GET /licence-expiries?days=30
    @GetMapping("/licence-expiries")
    fun getLicenceExpiries(
        @RequestParam(defaultValue = "30") days: Int
    ): ResponseEntity<List<LicenceExpiryItemDto>> {
        val now = Instant.now()
        val cutoff = now.plus(days.toLong(), ChronoUnit.DAYS)

        @Suppress("UNCHECKED_CAST")
        val results = em.createQuery(
            """SELECT app FROM com.assetmanagement.api.model.Application app
               LEFT JOIN FETCH app.applicationType
               WHERE app.isArchived = false
               AND app.expiryDate IS NOT NULL
               AND app.expiryDate > :now
               AND app.expiryDate <= :cutoff
               ORDER BY app.expiryDate ASC"""
        ).setParameter("now", now)
         .setParameter("cutoff", cutoff)
         .resultList as List<com.assetmanagement.api.model.Application>

        val items = results.map { app ->
            LicenceExpiryItemDto(
                id = app.id,
                name = app.name,
                applicationTypeName = app.applicationType?.name ?: "",
                expiryDate = app.expiryDate!!,
                daysUntilExpiry = ChronoUnit.DAYS.between(now, app.expiryDate!!).toInt(),
                status = app.status.name
            )
        }
        return ResponseEntity.ok(items)
    }

    // 14. GET /application-summary - count by ApplicationStatus
    @GetMapping("/application-summary")
    fun getApplicationSummary(): ResponseEntity<ApplicationSummaryDto> {
        @Suppress("UNCHECKED_CAST")
        val results = em.createQuery(
            """SELECT app.status, COUNT(app) FROM com.assetmanagement.api.model.Application app
               WHERE app.isArchived = false
               GROUP BY app.status"""
        ).resultList as List<Array<Any>>

        val statusMap = results.associate { row ->
            (row[0] as ApplicationStatus).name to (row[1] as Long).toInt()
        }

        val total = statusMap.values.sum()
        return ResponseEntity.ok(
            ApplicationSummaryDto(
                totalApplications = total,
                active = statusMap["Active"] ?: 0,
                expired = statusMap["Expired"] ?: 0,
                pendingRenewal = statusMap["PendingRenewal"] ?: 0,
                suspended = statusMap["Suspended"] ?: 0
            )
        )
    }
}
