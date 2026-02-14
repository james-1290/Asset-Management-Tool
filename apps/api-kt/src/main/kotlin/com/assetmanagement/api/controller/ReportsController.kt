package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.enums.AssetStatus
import com.assetmanagement.api.util.CsvUtils
import com.assetmanagement.api.model.enums.ApplicationStatus
import com.assetmanagement.api.model.enums.CertificateStatus
import com.opencsv.CSVWriter
import jakarta.persistence.EntityManager
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.io.ByteArrayOutputStream
import java.io.OutputStreamWriter
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.*

@RestController
@RequestMapping("/api/v1/reports")
class ReportsController(
    private val em: EntityManager
) {
    private val dateFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneOffset.UTC)

    /** Parse optional from/to date strings into Instants (start of day UTC). */
    private fun parseDateRange(from: String?, to: String?): Pair<Instant?, Instant?> {
        val fromInstant = from?.let { LocalDate.parse(it).atStartOfDay(ZoneOffset.UTC).toInstant() }
        val toInstant = to?.let { LocalDate.parse(it).plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant() } // inclusive end
        return Pair(fromInstant, toInstant)
    }

    // ---- Helper for CSV responses ----
    private fun csvResponse(filename: String, block: (CSVWriter) -> Unit): ResponseEntity<ByteArray> {
        val baos = ByteArrayOutputStream()
        val writer = CSVWriter(OutputStreamWriter(baos))
        block(writer)
        writer.flush()
        writer.close()
        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=$filename")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(baos.toByteArray())
    }

    // ---- Shared query helpers (avoid duplication with DashboardController) ----

    private fun queryTotalAssets(): Int {
        return (em.createQuery(
            "SELECT COUNT(a) FROM Asset a WHERE a.isArchived = false", java.lang.Long::class.java
        ).singleResult).toInt()
    }

    private fun queryTotalValue(): BigDecimal {
        return em.createQuery(
            "SELECT COALESCE(SUM(a.purchaseCost), 0) FROM Asset a WHERE a.isArchived = false",
            BigDecimal::class.java
        ).singleResult ?: BigDecimal.ZERO
    }

    @Suppress("UNCHECKED_CAST")
    private fun queryStatusBreakdown(): List<StatusBreakdownItemDto> {
        val results = em.createQuery(
            "SELECT a.status, COUNT(a) FROM Asset a WHERE a.isArchived = false GROUP BY a.status"
        ).resultList as List<Array<Any>>
        return results.map { row ->
            StatusBreakdownItemDto(
                status = (row[0] as AssetStatus).name,
                count = (row[1] as Long).toInt()
            )
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun queryByType(): List<AssetsByGroupItemDto> {
        val results = em.createQuery(
            """SELECT t.name, COUNT(a) FROM com.assetmanagement.api.model.Asset a
               JOIN a.assetType t WHERE a.isArchived = false
               GROUP BY t.name ORDER BY COUNT(a) DESC"""
        ).resultList as List<Array<Any>>
        return results.map { row ->
            AssetsByGroupItemDto(label = row[0] as String, count = (row[1] as Long).toInt())
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun queryByLocation(): List<AssetsByGroupItemDto> {
        val results = em.createQuery(
            """SELECT COALESCE(l.name, 'Unassigned'), COUNT(a)
               FROM com.assetmanagement.api.model.Asset a LEFT JOIN a.location l
               WHERE a.isArchived = false GROUP BY l.name ORDER BY COUNT(a) DESC"""
        ).resultList as List<Array<Any>>
        return results.map { row ->
            AssetsByGroupItemDto(label = row[0] as String, count = (row[1] as Long).toInt())
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun queryAgeBuckets(): List<AssetsByAgeBucketDto> {
        val purchaseDates = em.createQuery(
            "SELECT a.purchaseDate FROM com.assetmanagement.api.model.Asset a WHERE a.isArchived = false AND a.purchaseDate IS NOT NULL"
        ).resultList as List<Instant>
        val now = Instant.now()
        var lt1 = 0; var oneToThree = 0; var threeToFive = 0; var fivePlus = 0
        purchaseDates.forEach { pd ->
            val days = ChronoUnit.DAYS.between(pd, now)
            when {
                days < 365 -> lt1++
                days < 365 * 3 -> oneToThree++
                days < 365 * 5 -> threeToFive++
                else -> fivePlus++
            }
        }
        return listOf(
            AssetsByAgeBucketDto("< 1 Year", lt1),
            AssetsByAgeBucketDto("1-3 Years", oneToThree),
            AssetsByAgeBucketDto("3-5 Years", threeToFive),
            AssetsByAgeBucketDto("5+ Years", fivePlus)
        )
    }

    // ========================================================================
    // 1. GET /asset-summary
    // ========================================================================
    @GetMapping("/asset-summary")
    fun assetSummary(
        @RequestParam(required = false) format: String?
    ): ResponseEntity<*> {
        val totalAssets = queryTotalAssets()
        val totalValue = queryTotalValue()
        val byStatus = queryStatusBreakdown()
        val byType = queryByType()
        val byLocation = queryByLocation()

        if (format.equals("csv", ignoreCase = true)) {
            return csvResponse("asset-summary.csv") { writer ->
                writer.writeNext(arrayOf("Metric", "Value"))
                writer.writeNext(CsvUtils.sanitizeRow(arrayOf("Total Assets", totalAssets.toString())))
                writer.writeNext(CsvUtils.sanitizeRow(arrayOf("Total Value", totalValue.toPlainString())))
                writer.writeNext(arrayOf("", ""))
                writer.writeNext(arrayOf("Status", "Count"))
                byStatus.forEach { writer.writeNext(CsvUtils.sanitizeRow(arrayOf(it.status, it.count.toString()))) }
                writer.writeNext(arrayOf("", ""))
                writer.writeNext(arrayOf("Type", "Count"))
                byType.forEach { writer.writeNext(CsvUtils.sanitizeRow(arrayOf(it.label, it.count.toString()))) }
                writer.writeNext(arrayOf("", ""))
                writer.writeNext(arrayOf("Location", "Count"))
                byLocation.forEach { writer.writeNext(CsvUtils.sanitizeRow(arrayOf(it.label, it.count.toString()))) }
            }
        }

        return ResponseEntity.ok(
            AssetSummaryReportDto(
                totalAssets = totalAssets,
                totalValue = totalValue,
                byStatus = byStatus,
                byType = byType,
                byLocation = byLocation
            )
        )
    }

    // ========================================================================
    // 2. GET /expiries?days=30
    // ========================================================================
    @GetMapping("/expiries")
    fun expiries(
        @RequestParam(required = false) days: Int?,
        @RequestParam(required = false) from: String?,
        @RequestParam(required = false) to: String?,
        @RequestParam(required = false) format: String?
    ): ResponseEntity<*> {
        val now = Instant.now()

        // If from/to provided, use them; otherwise fall back to days (default 30)
        val (rangeFrom, rangeTo) = if (from != null || to != null) {
            parseDateRange(from, to)
        } else {
            Pair(null, null)
        }
        val effectiveFrom = rangeFrom ?: now
        val effectiveTo = rangeTo ?: now.plus((days ?: 30).toLong(), ChronoUnit.DAYS)

        val items = mutableListOf<ExpiryItemDto>()

        // Warranty expiries
        @Suppress("UNCHECKED_CAST")
        val assets = em.createQuery(
            """SELECT a FROM com.assetmanagement.api.model.Asset a
               LEFT JOIN FETCH a.assetType
               WHERE a.isArchived = false AND a.warrantyExpiryDate IS NOT NULL
               AND a.warrantyExpiryDate >= :rangeFrom AND a.warrantyExpiryDate < :rangeTo"""
        ).setParameter("rangeFrom", effectiveFrom).setParameter("rangeTo", effectiveTo)
         .resultList as List<com.assetmanagement.api.model.Asset>

        assets.forEach { a ->
            items.add(ExpiryItemDto(
                id = a.id,
                name = a.name,
                category = "Warranty",
                typeName = a.assetType?.name ?: "",
                expiryDate = a.warrantyExpiryDate!!,
                daysUntilExpiry = ChronoUnit.DAYS.between(now, a.warrantyExpiryDate!!).toInt(),
                status = a.status.name
            ))
        }

        // Certificate expiries
        @Suppress("UNCHECKED_CAST")
        val certs = em.createQuery(
            """SELECT c FROM com.assetmanagement.api.model.Certificate c
               LEFT JOIN FETCH c.certificateType
               WHERE c.isArchived = false AND c.expiryDate IS NOT NULL
               AND c.expiryDate >= :rangeFrom AND c.expiryDate < :rangeTo"""
        ).setParameter("rangeFrom", effectiveFrom).setParameter("rangeTo", effectiveTo)
         .resultList as List<com.assetmanagement.api.model.Certificate>

        certs.forEach { c ->
            items.add(ExpiryItemDto(
                id = c.id,
                name = c.name,
                category = "Certificate",
                typeName = c.certificateType?.name ?: "",
                expiryDate = c.expiryDate!!,
                daysUntilExpiry = ChronoUnit.DAYS.between(now, c.expiryDate!!).toInt(),
                status = c.status.name
            ))
        }

        // Licence expiries
        @Suppress("UNCHECKED_CAST")
        val apps = em.createQuery(
            """SELECT app FROM com.assetmanagement.api.model.Application app
               LEFT JOIN FETCH app.applicationType
               WHERE app.isArchived = false AND app.expiryDate IS NOT NULL
               AND app.expiryDate >= :rangeFrom AND app.expiryDate < :rangeTo"""
        ).setParameter("rangeFrom", effectiveFrom).setParameter("rangeTo", effectiveTo)
         .resultList as List<com.assetmanagement.api.model.Application>

        apps.forEach { app ->
            items.add(ExpiryItemDto(
                id = app.id,
                name = app.name,
                category = "Licence",
                typeName = app.applicationType?.name ?: "",
                expiryDate = app.expiryDate!!,
                daysUntilExpiry = ChronoUnit.DAYS.between(now, app.expiryDate!!).toInt(),
                status = app.status.name
            ))
        }

        items.sortBy { it.daysUntilExpiry }

        if (format.equals("csv", ignoreCase = true)) {
            return csvResponse("expiries.csv") { writer ->
                writer.writeNext(arrayOf("Category", "Name", "Type", "ExpiryDate", "DaysUntilExpiry", "Status"))
                items.forEach { item ->
                    writer.writeNext(CsvUtils.sanitizeRow(arrayOf(
                        item.category, item.name, item.typeName,
                        dateFormat.format(item.expiryDate),
                        item.daysUntilExpiry.toString(), item.status
                    )))
                }
            }
        }

        return ResponseEntity.ok(ExpiriesReportDto(items = items, totalCount = items.size))
    }

    // ========================================================================
    // 3. GET /licence-summary
    // ========================================================================
    @GetMapping("/licence-summary")
    fun licenceSummary(
        @RequestParam(required = false) from: String?,
        @RequestParam(required = false) to: String?,
        @RequestParam(required = false) format: String?
    ): ResponseEntity<*> {
        @Suppress("UNCHECKED_CAST")
        val statusResults = em.createQuery(
            """SELECT app.status, COUNT(app) FROM com.assetmanagement.api.model.Application app
               WHERE app.isArchived = false GROUP BY app.status"""
        ).resultList as List<Array<Any>>

        val statusMap = statusResults.associate { row ->
            (row[0] as ApplicationStatus).name to (row[1] as Long).toInt()
        }
        val total = statusMap.values.sum()
        val active = statusMap["Active"] ?: 0
        val expired = statusMap["Expired"] ?: 0
        val pendingRenewal = statusMap["PendingRenewal"] ?: 0
        val suspended = statusMap["Suspended"] ?: 0

        val totalSpend = em.createQuery(
            "SELECT COALESCE(SUM(app.purchaseCost), 0) FROM com.assetmanagement.api.model.Application app WHERE app.isArchived = false",
            BigDecimal::class.java
        ).singleResult ?: BigDecimal.ZERO

        val now = Instant.now()

        // If from/to provided, use them for "expiring soon"; otherwise default 30 days
        val (rangeFrom, rangeTo) = if (from != null || to != null) {
            parseDateRange(from, to)
        } else {
            Pair(null, null)
        }
        val effectiveFrom = rangeFrom ?: now
        val effectiveTo = rangeTo ?: now.plus(30, ChronoUnit.DAYS)

        @Suppress("UNCHECKED_CAST")
        val expiringSoonApps = em.createQuery(
            """SELECT app FROM com.assetmanagement.api.model.Application app
               LEFT JOIN FETCH app.applicationType
               WHERE app.isArchived = false AND app.expiryDate IS NOT NULL
               AND app.expiryDate >= :rangeFrom AND app.expiryDate < :rangeTo
               ORDER BY app.expiryDate ASC"""
        ).setParameter("rangeFrom", effectiveFrom).setParameter("rangeTo", effectiveTo)
         .resultList as List<com.assetmanagement.api.model.Application>

        val expiringSoon = expiringSoonApps.map { app ->
            LicenceExpiryItemDto(
                id = app.id,
                name = app.name,
                applicationTypeName = app.applicationType?.name ?: "",
                expiryDate = app.expiryDate!!,
                daysUntilExpiry = ChronoUnit.DAYS.between(now, app.expiryDate!!).toInt(),
                status = app.status.name
            )
        }

        if (format.equals("csv", ignoreCase = true)) {
            return csvResponse("licence-summary.csv") { writer ->
                writer.writeNext(arrayOf("Metric", "Value"))
                writer.writeNext(CsvUtils.sanitizeRow(arrayOf("Total Applications", total.toString())))
                writer.writeNext(CsvUtils.sanitizeRow(arrayOf("Active", active.toString())))
                writer.writeNext(CsvUtils.sanitizeRow(arrayOf("Expired", expired.toString())))
                writer.writeNext(CsvUtils.sanitizeRow(arrayOf("Pending Renewal", pendingRenewal.toString())))
                writer.writeNext(CsvUtils.sanitizeRow(arrayOf("Suspended", suspended.toString())))
                writer.writeNext(CsvUtils.sanitizeRow(arrayOf("Total Spend", totalSpend.toPlainString())))
                writer.writeNext(arrayOf("", ""))
                writer.writeNext(arrayOf("Expiring Soon", ""))
                writer.writeNext(arrayOf("Name", "Type", "ExpiryDate", "DaysUntilExpiry", "Status"))
                expiringSoon.forEach { item ->
                    writer.writeNext(CsvUtils.sanitizeRow(arrayOf(
                        item.name, item.applicationTypeName,
                        dateFormat.format(item.expiryDate),
                        item.daysUntilExpiry.toString(), item.status
                    )))
                }
            }
        }

        return ResponseEntity.ok(
            LicenceSummaryReportDto(
                totalApplications = total,
                active = active,
                expired = expired,
                pendingRenewal = pendingRenewal,
                suspended = suspended,
                totalSpend = totalSpend,
                expiringSoon = expiringSoon
            )
        )
    }

    // ========================================================================
    // 4. GET /assignments
    // ========================================================================
    @GetMapping("/assignments")
    fun assignments(
        @RequestParam(required = false) format: String?
    ): ResponseEntity<*> {
        @Suppress("UNCHECKED_CAST")
        val people = em.createQuery(
            """SELECT p FROM com.assetmanagement.api.model.Person p
               LEFT JOIN FETCH p.assignedAssets
               WHERE p.isArchived = false"""
        ).resultList as List<com.assetmanagement.api.model.Person>

        val peopleWithAssets = people.filter { p ->
            p.assignedAssets.any { !it.isArchived }
        }

        val personDtos = peopleWithAssets.map { p ->
            val activeAssets = p.assignedAssets.filter { !it.isArchived }
            PersonAssignmentDto(
                personId = p.id,
                fullName = p.fullName,
                email = p.email,
                assignedAssetCount = activeAssets.size,
                assets = activeAssets.map { a ->
                    AssignedAssetBriefDto(id = a.id, name = a.name)
                }
            )
        }.sortedByDescending { it.assignedAssetCount }

        val totalAssigned = personDtos.sumOf { it.assignedAssetCount }

        if (format.equals("csv", ignoreCase = true)) {
            return csvResponse("assignments.csv") { writer ->
                writer.writeNext(arrayOf("Person", "Email", "AssetCount", "AssetName"))
                personDtos.forEach { person ->
                    if (person.assets.isEmpty()) {
                        writer.writeNext(CsvUtils.sanitizeRow(arrayOf(
                            person.fullName, person.email ?: "",
                            person.assignedAssetCount.toString(), ""
                        )))
                    } else {
                        person.assets.forEach { asset ->
                            writer.writeNext(CsvUtils.sanitizeRow(arrayOf(
                                person.fullName, person.email ?: "",
                                person.assignedAssetCount.toString(),
                                asset.name
                            )))
                        }
                    }
                }
            }
        }

        return ResponseEntity.ok(
            AssignmentsReportDto(
                totalAssigned = totalAssigned,
                totalPeople = personDtos.size,
                people = personDtos
            )
        )
    }

    // ========================================================================
    // 5. GET /asset-lifecycle
    // ========================================================================
    @GetMapping("/asset-lifecycle")
    fun assetLifecycle(
        @RequestParam(required = false) from: String?,
        @RequestParam(required = false) to: String?,
        @RequestParam(required = false) format: String?
    ): ResponseEntity<*> {
        val now = Instant.now()
        val (rangeFrom, rangeTo) = parseDateRange(from, to)
        val byAge = queryAgeBuckets()

        // Past warranty - assets where warranty has already expired
        // If from/to provided, filter warranty expiry within that window; otherwise show all past warranty
        @Suppress("UNCHECKED_CAST")
        val pastWarrantyAssets = if (rangeFrom != null || rangeTo != null) {
            val qFrom = rangeFrom ?: Instant.EPOCH
            val qTo = rangeTo ?: now
            em.createQuery(
                """SELECT a FROM com.assetmanagement.api.model.Asset a
                   LEFT JOIN FETCH a.assetType
                   WHERE a.isArchived = false
                   AND a.warrantyExpiryDate IS NOT NULL
                   AND a.warrantyExpiryDate >= :rangeFrom AND a.warrantyExpiryDate < :rangeTo
                   ORDER BY a.warrantyExpiryDate ASC"""
            ).setParameter("rangeFrom", qFrom).setParameter("rangeTo", qTo)
             .resultList as List<com.assetmanagement.api.model.Asset>
        } else {
            em.createQuery(
                """SELECT a FROM com.assetmanagement.api.model.Asset a
                   LEFT JOIN FETCH a.assetType
                   WHERE a.isArchived = false
                   AND a.warrantyExpiryDate IS NOT NULL
                   AND a.warrantyExpiryDate < :now
                   ORDER BY a.warrantyExpiryDate ASC"""
            ).setParameter("now", now)
             .resultList as List<com.assetmanagement.api.model.Asset>
        }

        val pastWarranty = pastWarrantyAssets.map { a ->
            WarrantyExpiryItemDto(
                id = a.id,
                name = a.name,
                assetTypeName = a.assetType?.name ?: "",
                warrantyExpiryDate = a.warrantyExpiryDate!!,
                daysUntilExpiry = ChronoUnit.DAYS.between(now, a.warrantyExpiryDate!!).toInt()
            )
        }

        // Oldest assets — if from/to provided, filter by purchase date window
        @Suppress("UNCHECKED_CAST")
        val oldestAssetsList = if (rangeFrom != null || rangeTo != null) {
            val qFrom = rangeFrom ?: Instant.EPOCH
            val qTo = rangeTo ?: now
            em.createQuery(
                """SELECT a FROM com.assetmanagement.api.model.Asset a
                   LEFT JOIN FETCH a.assetType
                   WHERE a.isArchived = false AND a.purchaseDate IS NOT NULL
                   AND a.purchaseDate >= :rangeFrom AND a.purchaseDate < :rangeTo
                   ORDER BY a.purchaseDate ASC"""
            ).setParameter("rangeFrom", qFrom).setParameter("rangeTo", qTo)
             .setMaxResults(20)
             .resultList as List<com.assetmanagement.api.model.Asset>
        } else {
            em.createQuery(
                """SELECT a FROM com.assetmanagement.api.model.Asset a
                   LEFT JOIN FETCH a.assetType
                   WHERE a.isArchived = false AND a.purchaseDate IS NOT NULL
                   ORDER BY a.purchaseDate ASC"""
            ).setMaxResults(10)
             .resultList as List<com.assetmanagement.api.model.Asset>
        }

        val oldestAssets = oldestAssetsList.map { a ->
            OldestAssetDto(
                id = a.id,
                name = a.name,
                assetTypeName = a.assetType?.name ?: "",
                purchaseDate = a.purchaseDate!!,
                ageDays = ChronoUnit.DAYS.between(a.purchaseDate!!, now).toInt()
            )
        }

        if (format.equals("csv", ignoreCase = true)) {
            return csvResponse("asset-lifecycle.csv") { writer ->
                writer.writeNext(arrayOf("Age Bucket", "Count"))
                byAge.forEach { writer.writeNext(CsvUtils.sanitizeRow(arrayOf(it.bucket, it.count.toString()))) }
                writer.writeNext(arrayOf("", ""))
                writer.writeNext(arrayOf("Past Warranty Assets", ""))
                writer.writeNext(arrayOf("Name", "Type", "WarrantyExpiry", "DaysOverdue"))
                pastWarranty.forEach { item ->
                    writer.writeNext(CsvUtils.sanitizeRow(arrayOf(
                        item.name, item.assetTypeName,
                        dateFormat.format(item.warrantyExpiryDate),
                        Math.abs(item.daysUntilExpiry).toString()
                    )))
                }
                writer.writeNext(arrayOf("", ""))
                writer.writeNext(arrayOf("Oldest Assets", ""))
                writer.writeNext(arrayOf("Name", "Type", "PurchaseDate", "AgeDays"))
                oldestAssets.forEach { item ->
                    writer.writeNext(CsvUtils.sanitizeRow(arrayOf(
                        item.name, item.assetTypeName,
                        dateFormat.format(item.purchaseDate),
                        item.ageDays.toString()
                    )))
                }
            }
        }

        return ResponseEntity.ok(
            AssetLifecycleReportDto(
                byAge = byAge,
                pastWarranty = pastWarranty,
                oldestAssets = oldestAssets
            )
        )
    }

    // ========================================================================
    // 6. GET /depreciation
    // ========================================================================
    @GetMapping("/depreciation")
    fun depreciation(
        @RequestParam(required = false) assetTypeId: UUID?,
        @RequestParam(required = false) locationId: UUID?,
        @RequestParam(required = false) format: String?
    ): ResponseEntity<*> {
        val now = Instant.now()

        // Build dynamic JPQL query with optional filters
        val jpql = StringBuilder(
            """SELECT a FROM com.assetmanagement.api.model.Asset a
               LEFT JOIN FETCH a.assetType
               WHERE a.isArchived = false
               AND a.purchaseCost IS NOT NULL
               AND a.purchaseDate IS NOT NULL"""
        )
        if (assetTypeId != null) jpql.append(" AND a.assetTypeId = :assetTypeId")
        if (locationId != null) jpql.append(" AND a.locationId = :locationId")
        jpql.append(" ORDER BY a.assetType.name ASC, a.name ASC")

        val query = em.createQuery(jpql.toString())
        if (assetTypeId != null) query.setParameter("assetTypeId", assetTypeId)
        if (locationId != null) query.setParameter("locationId", locationId)

        @Suppress("UNCHECKED_CAST")
        val assets = query.resultList as List<com.assetmanagement.api.model.Asset>

        // Calculate depreciation per asset
        val assetDtos = assets.map { a ->
            val cost = a.purchaseCost!!
            val purchaseDate = a.purchaseDate!!
            val depMonths = a.depreciationMonths ?: a.assetType?.defaultDepreciationMonths
            val usefulLifeYears = if (depMonths != null && depMonths > 0) depMonths / 12 else null

            val accumulatedDepreciation: BigDecimal
            val currentBookValue: BigDecimal
            val remainingUsefulLifeMonths: Int?

            if (depMonths != null && depMonths > 0) {
                val monthly = cost.divide(BigDecimal(depMonths), 4, RoundingMode.HALF_UP)
                val elapsedDays = ChronoUnit.DAYS.between(purchaseDate, now)
                val elapsedMonths = BigDecimal(elapsedDays)
                    .divide(BigDecimal("30.44"), 0, RoundingMode.FLOOR).toLong()
                    .coerceIn(0, depMonths.toLong())
                accumulatedDepreciation = (monthly * BigDecimal(elapsedMonths))
                    .setScale(2, RoundingMode.HALF_UP)
                    .coerceAtMost(cost)
                currentBookValue = (cost - accumulatedDepreciation).coerceAtLeast(BigDecimal.ZERO)
                val totalElapsedMonths = BigDecimal(ChronoUnit.DAYS.between(purchaseDate, now))
                    .divide(BigDecimal("30.44"), 0, RoundingMode.FLOOR).toLong()
                remainingUsefulLifeMonths = (depMonths - totalElapsedMonths).coerceAtLeast(0).toInt()
            } else {
                // No depreciation configured — book value = purchase cost
                accumulatedDepreciation = BigDecimal.ZERO
                currentBookValue = cost
                remainingUsefulLifeMonths = null
            }

            DepreciationAssetDto(
                id = a.id,
                name = a.name,
                assetTypeName = a.assetType?.name ?: "",
                purchaseDate = a.purchaseDate,
                originalCost = cost,
                depreciationMethod = if (depMonths != null && depMonths > 0) "Straight-Line" else "None",
                usefulLifeYears = usefulLifeYears,
                accumulatedDepreciation = accumulatedDepreciation,
                currentBookValue = currentBookValue,
                remainingUsefulLifeMonths = remainingUsefulLifeMonths
            )
        }

        // Group by asset type
        val groups = assetDtos.groupBy { it.assetTypeName }.map { (typeName, typeAssets) ->
            DepreciationGroupDto(
                assetTypeName = typeName,
                subtotalOriginalCost = typeAssets.sumOf { it.originalCost },
                subtotalAccumulatedDepreciation = typeAssets.sumOf { it.accumulatedDepreciation },
                subtotalBookValue = typeAssets.sumOf { it.currentBookValue },
                assets = typeAssets
            )
        }

        val report = DepreciationReportDto(
            totalOriginalCost = groups.sumOf { it.subtotalOriginalCost },
            totalAccumulatedDepreciation = groups.sumOf { it.subtotalAccumulatedDepreciation },
            totalBookValue = groups.sumOf { it.subtotalBookValue },
            groups = groups
        )

        if (format.equals("csv", ignoreCase = true)) {
            return csvResponse("depreciation-report.csv") { writer ->
                writer.writeNext(arrayOf(
                    "Asset Name", "Asset Type", "Purchase Date", "Original Cost",
                    "Method", "Useful Life (Years)", "Accumulated Depreciation",
                    "Book Value", "Remaining Life (Months)"
                ))
                assetDtos.forEach { a ->
                    writer.writeNext(CsvUtils.sanitizeRow(arrayOf(
                        a.name,
                        a.assetTypeName,
                        a.purchaseDate?.let { dateFormat.format(it) } ?: "",
                        a.originalCost.toPlainString(),
                        a.depreciationMethod,
                        a.usefulLifeYears?.toString() ?: "",
                        a.accumulatedDepreciation.toPlainString(),
                        a.currentBookValue.toPlainString(),
                        a.remainingUsefulLifeMonths?.toString() ?: ""
                    )))
                }
            }
        }

        return ResponseEntity.ok(report)
    }
}
