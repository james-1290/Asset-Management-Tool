package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.enums.AssetStatus
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
import java.time.Instant
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
                writer.writeNext(arrayOf("Total Assets", totalAssets.toString()))
                writer.writeNext(arrayOf("Total Value", totalValue.toPlainString()))
                writer.writeNext(arrayOf("", ""))
                writer.writeNext(arrayOf("Status", "Count"))
                byStatus.forEach { writer.writeNext(arrayOf(it.status, it.count.toString())) }
                writer.writeNext(arrayOf("", ""))
                writer.writeNext(arrayOf("Type", "Count"))
                byType.forEach { writer.writeNext(arrayOf(it.label, it.count.toString())) }
                writer.writeNext(arrayOf("", ""))
                writer.writeNext(arrayOf("Location", "Count"))
                byLocation.forEach { writer.writeNext(arrayOf(it.label, it.count.toString())) }
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
        @RequestParam(defaultValue = "30") days: Int,
        @RequestParam(required = false) format: String?
    ): ResponseEntity<*> {
        val now = Instant.now()
        val cutoff = now.plus(days.toLong(), ChronoUnit.DAYS)
        val items = mutableListOf<ExpiryItemDto>()

        // Warranty expiries
        @Suppress("UNCHECKED_CAST")
        val assets = em.createQuery(
            """SELECT a FROM com.assetmanagement.api.model.Asset a
               LEFT JOIN FETCH a.assetType
               WHERE a.isArchived = false AND a.warrantyExpiryDate IS NOT NULL
               AND a.warrantyExpiryDate > :now AND a.warrantyExpiryDate <= :cutoff"""
        ).setParameter("now", now).setParameter("cutoff", cutoff)
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
               AND c.expiryDate > :now AND c.expiryDate <= :cutoff"""
        ).setParameter("now", now).setParameter("cutoff", cutoff)
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
               AND app.expiryDate > :now AND app.expiryDate <= :cutoff"""
        ).setParameter("now", now).setParameter("cutoff", cutoff)
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
                    writer.writeNext(arrayOf(
                        item.category, item.name, item.typeName,
                        dateFormat.format(item.expiryDate),
                        item.daysUntilExpiry.toString(), item.status
                    ))
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
        val cutoff = now.plus(30, ChronoUnit.DAYS)

        @Suppress("UNCHECKED_CAST")
        val expiringSoonApps = em.createQuery(
            """SELECT app FROM com.assetmanagement.api.model.Application app
               LEFT JOIN FETCH app.applicationType
               WHERE app.isArchived = false AND app.expiryDate IS NOT NULL
               AND app.expiryDate > :now AND app.expiryDate <= :cutoff
               ORDER BY app.expiryDate ASC"""
        ).setParameter("now", now).setParameter("cutoff", cutoff)
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
                writer.writeNext(arrayOf("Total Applications", total.toString()))
                writer.writeNext(arrayOf("Active", active.toString()))
                writer.writeNext(arrayOf("Expired", expired.toString()))
                writer.writeNext(arrayOf("Pending Renewal", pendingRenewal.toString()))
                writer.writeNext(arrayOf("Suspended", suspended.toString()))
                writer.writeNext(arrayOf("Total Spend", totalSpend.toPlainString()))
                writer.writeNext(arrayOf("", ""))
                writer.writeNext(arrayOf("Expiring Soon", ""))
                writer.writeNext(arrayOf("Name", "Type", "ExpiryDate", "DaysUntilExpiry", "Status"))
                expiringSoon.forEach { item ->
                    writer.writeNext(arrayOf(
                        item.name, item.applicationTypeName,
                        dateFormat.format(item.expiryDate),
                        item.daysUntilExpiry.toString(), item.status
                    ))
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
                    AssignedAssetBriefDto(id = a.id, name = a.name, assetTag = a.assetTag)
                }
            )
        }.sortedByDescending { it.assignedAssetCount }

        val totalAssigned = personDtos.sumOf { it.assignedAssetCount }

        if (format.equals("csv", ignoreCase = true)) {
            return csvResponse("assignments.csv") { writer ->
                writer.writeNext(arrayOf("Person", "Email", "AssetCount", "AssetName", "AssetTag"))
                personDtos.forEach { person ->
                    if (person.assets.isEmpty()) {
                        writer.writeNext(arrayOf(
                            person.fullName, person.email ?: "",
                            person.assignedAssetCount.toString(), "", ""
                        ))
                    } else {
                        person.assets.forEach { asset ->
                            writer.writeNext(arrayOf(
                                person.fullName, person.email ?: "",
                                person.assignedAssetCount.toString(),
                                asset.name, asset.assetTag
                            ))
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
        @RequestParam(required = false) format: String?
    ): ResponseEntity<*> {
        val now = Instant.now()
        val byAge = queryAgeBuckets()

        // Past warranty - assets where warranty has already expired
        @Suppress("UNCHECKED_CAST")
        val pastWarrantyAssets = em.createQuery(
            """SELECT a FROM com.assetmanagement.api.model.Asset a
               LEFT JOIN FETCH a.assetType
               WHERE a.isArchived = false
               AND a.warrantyExpiryDate IS NOT NULL
               AND a.warrantyExpiryDate < :now
               ORDER BY a.warrantyExpiryDate ASC"""
        ).setParameter("now", now)
         .resultList as List<com.assetmanagement.api.model.Asset>

        val pastWarranty = pastWarrantyAssets.map { a ->
            WarrantyExpiryItemDto(
                id = a.id,
                name = a.name,
                assetTag = a.assetTag,
                assetTypeName = a.assetType?.name ?: "",
                warrantyExpiryDate = a.warrantyExpiryDate!!,
                daysUntilExpiry = ChronoUnit.DAYS.between(now, a.warrantyExpiryDate!!).toInt()
            )
        }

        // Oldest assets
        @Suppress("UNCHECKED_CAST")
        val oldestAssetsList = em.createQuery(
            """SELECT a FROM com.assetmanagement.api.model.Asset a
               LEFT JOIN FETCH a.assetType
               WHERE a.isArchived = false AND a.purchaseDate IS NOT NULL
               ORDER BY a.purchaseDate ASC"""
        ).setMaxResults(10)
         .resultList as List<com.assetmanagement.api.model.Asset>

        val oldestAssets = oldestAssetsList.map { a ->
            OldestAssetDto(
                id = a.id,
                name = a.name,
                assetTag = a.assetTag,
                assetTypeName = a.assetType?.name ?: "",
                purchaseDate = a.purchaseDate!!,
                ageDays = ChronoUnit.DAYS.between(a.purchaseDate!!, now).toInt()
            )
        }

        if (format.equals("csv", ignoreCase = true)) {
            return csvResponse("asset-lifecycle.csv") { writer ->
                writer.writeNext(arrayOf("Age Bucket", "Count"))
                byAge.forEach { writer.writeNext(arrayOf(it.bucket, it.count.toString())) }
                writer.writeNext(arrayOf("", ""))
                writer.writeNext(arrayOf("Past Warranty Assets", ""))
                writer.writeNext(arrayOf("Name", "AssetTag", "Type", "WarrantyExpiry", "DaysOverdue"))
                pastWarranty.forEach { item ->
                    writer.writeNext(arrayOf(
                        item.name, item.assetTag, item.assetTypeName,
                        dateFormat.format(item.warrantyExpiryDate),
                        Math.abs(item.daysUntilExpiry).toString()
                    ))
                }
                writer.writeNext(arrayOf("", ""))
                writer.writeNext(arrayOf("Oldest Assets", ""))
                writer.writeNext(arrayOf("Name", "AssetTag", "Type", "PurchaseDate", "AgeDays"))
                oldestAssets.forEach { item ->
                    writer.writeNext(arrayOf(
                        item.name, item.assetTag, item.assetTypeName,
                        dateFormat.format(item.purchaseDate),
                        item.ageDays.toString()
                    ))
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
}
