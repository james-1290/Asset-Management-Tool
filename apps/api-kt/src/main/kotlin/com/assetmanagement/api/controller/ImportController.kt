package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.*
import com.assetmanagement.api.model.enums.*
import com.assetmanagement.api.repository.*
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
import com.opencsv.CSVReaderBuilder
import com.opencsv.CSVWriter
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.io.ByteArrayOutputStream
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.*

@RestController
@RequestMapping("/api/v1/import")
class ImportController(
    private val locationRepository: LocationRepository,
    private val personRepository: PersonRepository,
    private val assetRepository: AssetRepository,
    private val assetTypeRepository: AssetTypeRepository,
    private val certificateRepository: CertificateRepository,
    private val certificateTypeRepository: CertificateTypeRepository,
    private val applicationRepository: ApplicationRepository,
    private val applicationTypeRepository: ApplicationTypeRepository,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService
) {

    companion object {
        private val VALID_ENTITY_TYPES = setOf("locations", "people", "assets", "certificates", "applications")

        private val LOCATION_HEADERS = arrayOf("Name", "Address", "City", "Country")
        private val PEOPLE_HEADERS = arrayOf("FullName", "Email", "Department", "JobTitle", "Location")
        private val ASSET_HEADERS = arrayOf(
            "Name", "AssetTag", "SerialNumber", "AssetType", "Status",
            "Location", "AssignedTo", "PurchaseDate", "PurchaseCost",
            "WarrantyExpiryDate", "DepreciationMonths", "Notes"
        )
        private val CERTIFICATE_HEADERS = arrayOf(
            "Name", "CertificateType", "Issuer", "Subject", "Thumbprint",
            "SerialNumber", "IssuedDate", "ExpiryDate", "Status", "AutoRenewal", "Notes"
        )
        private val APPLICATION_HEADERS = arrayOf(
            "Name", "ApplicationType", "Publisher", "Version", "LicenceKey",
            "LicenceType", "MaxSeats", "UsedSeats", "PurchaseDate", "ExpiryDate",
            "PurchaseCost", "AutoRenewal", "Status", "Notes"
        )

        private val DATE_FORMATTERS = listOf(
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("yyyy/MM/dd")
        )
    }

    // ========================================================================
    // 1. GET /{entityType}/template - Download CSV template
    // ========================================================================
    @GetMapping("/{entityType}/template")
    fun downloadTemplate(@PathVariable entityType: String): ResponseEntity<*> {
        if (entityType !in VALID_ENTITY_TYPES) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Invalid entity type: $entityType"))
        }

        val headers = when (entityType) {
            "locations" -> LOCATION_HEADERS
            "people" -> PEOPLE_HEADERS
            "assets" -> ASSET_HEADERS
            "certificates" -> CERTIFICATE_HEADERS
            "applications" -> APPLICATION_HEADERS
            else -> return ResponseEntity.badRequest().body(mapOf("error" to "Invalid entity type"))
        }

        val baos = ByteArrayOutputStream()
        val writer = CSVWriter(OutputStreamWriter(baos))
        writer.writeNext(headers)
        writer.flush()
        writer.close()

        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=${entityType}-template.csv")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(baos.toByteArray())
    }

    // ========================================================================
    // 2. POST /{entityType}/validate - Validate uploaded CSV
    // ========================================================================
    @PostMapping("/{entityType}/validate", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun validate(
        @PathVariable entityType: String,
        @RequestParam("file") file: MultipartFile
    ): ResponseEntity<*> {
        if (entityType !in VALID_ENTITY_TYPES) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Invalid entity type: $entityType"))
        }

        val reader = CSVReaderBuilder(InputStreamReader(file.inputStream))
            .withSkipLines(0)
            .build()

        val allRows = reader.readAll()
        if (allRows.isEmpty()) {
            return ResponseEntity.badRequest().body(mapOf("error" to "CSV file is empty"))
        }

        val headers = allRows[0].map { it.trim() }
        val dataRows = allRows.drop(1)

        val rows = dataRows.mapIndexed { index, row ->
            val data = mutableMapOf<String, String?>()
            headers.forEachIndexed { colIndex, header ->
                data[header] = if (colIndex < row.size) row[colIndex].trim().ifBlank { null } else null
            }

            val errors = when (entityType) {
                "locations" -> validateLocation(data)
                "people" -> validatePerson(data)
                "assets" -> validateAsset(data)
                "certificates" -> validateCertificate(data)
                "applications" -> validateApplication(data)
                else -> listOf("Unknown entity type")
            }

            ImportRowResult(
                rowNumber = index + 2, // 1-based, skip header
                isValid = errors.isEmpty(),
                errors = errors,
                data = data
            )
        }

        val validRows = rows.count { it.isValid }
        val invalidRows = rows.count { !it.isValid }

        return ResponseEntity.ok(
            ImportValidationResponse(
                entityType = entityType,
                totalRows = rows.size,
                validRows = validRows,
                invalidRows = invalidRows,
                rows = rows
            )
        )
    }

    // ========================================================================
    // 3. POST /{entityType}/execute - Execute import
    // ========================================================================
    @PostMapping("/{entityType}/execute", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun execute(
        @PathVariable entityType: String,
        @RequestParam("file") file: MultipartFile
    ): ResponseEntity<*> {
        if (entityType !in VALID_ENTITY_TYPES) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Invalid entity type: $entityType"))
        }

        val reader = CSVReaderBuilder(InputStreamReader(file.inputStream))
            .withSkipLines(0)
            .build()

        val allRows = reader.readAll()
        if (allRows.isEmpty()) {
            return ResponseEntity.badRequest().body(mapOf("error" to "CSV file is empty"))
        }

        val headers = allRows[0].map { it.trim() }
        val dataRows = allRows.drop(1)

        var imported = 0
        var skipped = 0
        var failed = 0
        val errors = mutableListOf<String>()

        dataRows.forEachIndexed { index, row ->
            val rowNum = index + 2
            val data = mutableMapOf<String, String?>()
            headers.forEachIndexed { colIndex, header ->
                data[header] = if (colIndex < row.size) row[colIndex].trim().ifBlank { null } else null
            }

            val validationErrors = when (entityType) {
                "locations" -> validateLocation(data)
                "people" -> validatePerson(data)
                "assets" -> validateAsset(data)
                "certificates" -> validateCertificate(data)
                "applications" -> validateApplication(data)
                else -> listOf("Unknown entity type")
            }

            if (validationErrors.isNotEmpty()) {
                skipped++
                errors.add("Row $rowNum: ${validationErrors.joinToString("; ")}")
                return@forEachIndexed
            }

            try {
                when (entityType) {
                    "locations" -> importLocation(data)
                    "people" -> importPerson(data)
                    "assets" -> importAsset(data)
                    "certificates" -> importCertificate(data)
                    "applications" -> importApplication(data)
                }
                imported++
            } catch (e: Exception) {
                failed++
                errors.add("Row $rowNum: ${e.message ?: "Unknown error"}")
            }
        }

        return ResponseEntity.ok(
            ImportExecuteResponse(
                entityType = entityType,
                imported = imported,
                skipped = skipped,
                failed = failed,
                errors = errors
            )
        )
    }

    // ========================================================================
    // Validation helpers
    // ========================================================================

    private fun validateLocation(data: Map<String, String?>): List<String> {
        val errors = mutableListOf<String>()
        val name = data["Name"]
        if (name.isNullOrBlank()) errors.add("Name is required")
        else if (name.length > 200) errors.add("Name must be 200 characters or less")
        data["Address"]?.let { if (it.length > 500) errors.add("Address must be 500 characters or less") }
        data["City"]?.let { if (it.length > 200) errors.add("City must be 200 characters or less") }
        data["Country"]?.let { if (it.length > 200) errors.add("Country must be 200 characters or less") }
        return errors
    }

    private fun validatePerson(data: Map<String, String?>): List<String> {
        val errors = mutableListOf<String>()
        val fullName = data["FullName"]
        if (fullName.isNullOrBlank()) errors.add("FullName is required")
        else if (fullName.length > 200) errors.add("FullName must be 200 characters or less")

        val email = data["Email"]
        if (!email.isNullOrBlank()) {
            if (!email.contains("@") || !email.contains(".")) {
                errors.add("Email is not a valid email address")
            }
            if (email.length > 200) errors.add("Email must be 200 characters or less")
        }

        data["Department"]?.let { if (it.length > 200) errors.add("Department must be 200 characters or less") }
        data["JobTitle"]?.let { if (it.length > 200) errors.add("JobTitle must be 200 characters or less") }

        val locationName = data["Location"]
        if (!locationName.isNullOrBlank()) {
            val location = findLocationByName(locationName)
            if (location == null) errors.add("Location '$locationName' not found")
        }

        return errors
    }

    private fun validateAsset(data: Map<String, String?>): List<String> {
        val errors = mutableListOf<String>()

        val name = data["Name"]
        if (name.isNullOrBlank()) errors.add("Name is required")
        else if (name.length > 200) errors.add("Name must be 200 characters or less")

        val assetTag = data["AssetTag"]
        if (assetTag.isNullOrBlank()) errors.add("AssetTag is required")
        else {
            if (assetTag.length > 100) errors.add("AssetTag must be 100 characters or less")
            if (assetRepository.existsByAssetTag(assetTag)) errors.add("AssetTag '$assetTag' already exists")
        }

        val assetTypeName = data["AssetType"]
        if (assetTypeName.isNullOrBlank()) errors.add("AssetType is required")
        else {
            val assetType = findAssetTypeByName(assetTypeName)
            if (assetType == null) errors.add("AssetType '$assetTypeName' not found")
        }

        val statusStr = data["Status"]
        if (!statusStr.isNullOrBlank()) {
            try {
                AssetStatus.valueOf(statusStr)
            } catch (_: IllegalArgumentException) {
                errors.add("Invalid Status '$statusStr'. Valid values: ${AssetStatus.entries.joinToString(", ") { it.name }}")
            }
        }

        val locationName = data["Location"]
        if (!locationName.isNullOrBlank()) {
            if (findLocationByName(locationName) == null) errors.add("Location '$locationName' not found")
        }

        val assignedTo = data["AssignedTo"]
        if (!assignedTo.isNullOrBlank()) {
            if (findPersonByName(assignedTo) == null) errors.add("Person '$assignedTo' not found")
        }

        val purchaseDate = data["PurchaseDate"]
        if (!purchaseDate.isNullOrBlank()) {
            if (parseDate(purchaseDate) == null) errors.add("PurchaseDate '$purchaseDate' is not a valid date")
        }

        val purchaseCost = data["PurchaseCost"]
        if (!purchaseCost.isNullOrBlank()) {
            try {
                BigDecimal(purchaseCost)
            } catch (_: NumberFormatException) {
                errors.add("PurchaseCost '$purchaseCost' is not a valid number")
            }
        }

        val warrantyExpiryDate = data["WarrantyExpiryDate"]
        if (!warrantyExpiryDate.isNullOrBlank()) {
            if (parseDate(warrantyExpiryDate) == null) errors.add("WarrantyExpiryDate '$warrantyExpiryDate' is not a valid date")
        }

        val depreciationMonths = data["DepreciationMonths"]
        if (!depreciationMonths.isNullOrBlank()) {
            try {
                depreciationMonths.toInt()
            } catch (_: NumberFormatException) {
                errors.add("DepreciationMonths '$depreciationMonths' is not a valid integer")
            }
        }

        return errors
    }

    private fun validateCertificate(data: Map<String, String?>): List<String> {
        val errors = mutableListOf<String>()

        val name = data["Name"]
        if (name.isNullOrBlank()) errors.add("Name is required")
        else if (name.length > 200) errors.add("Name must be 200 characters or less")

        val certTypeName = data["CertificateType"]
        if (certTypeName.isNullOrBlank()) errors.add("CertificateType is required")
        else {
            if (findCertificateTypeByName(certTypeName) == null) errors.add("CertificateType '$certTypeName' not found")
        }

        val statusStr = data["Status"]
        if (!statusStr.isNullOrBlank()) {
            try {
                CertificateStatus.valueOf(statusStr)
            } catch (_: IllegalArgumentException) {
                errors.add("Invalid Status '$statusStr'. Valid values: ${CertificateStatus.entries.joinToString(", ") { it.name }}")
            }
        }

        val issuedDate = data["IssuedDate"]
        if (!issuedDate.isNullOrBlank()) {
            if (parseDate(issuedDate) == null) errors.add("IssuedDate '$issuedDate' is not a valid date")
        }

        val expiryDate = data["ExpiryDate"]
        if (!expiryDate.isNullOrBlank()) {
            if (parseDate(expiryDate) == null) errors.add("ExpiryDate '$expiryDate' is not a valid date")
        }

        val autoRenewal = data["AutoRenewal"]
        if (!autoRenewal.isNullOrBlank()) {
            if (!isValidBoolean(autoRenewal)) errors.add("AutoRenewal '$autoRenewal' is not a valid boolean (true/false/yes/no/1/0)")
        }

        return errors
    }

    private fun validateApplication(data: Map<String, String?>): List<String> {
        val errors = mutableListOf<String>()

        val name = data["Name"]
        if (name.isNullOrBlank()) errors.add("Name is required")
        else if (name.length > 200) errors.add("Name must be 200 characters or less")

        val appTypeName = data["ApplicationType"]
        if (appTypeName.isNullOrBlank()) errors.add("ApplicationType is required")
        else {
            if (findApplicationTypeByName(appTypeName) == null) errors.add("ApplicationType '$appTypeName' not found")
        }

        val statusStr = data["Status"]
        if (!statusStr.isNullOrBlank()) {
            try {
                ApplicationStatus.valueOf(statusStr)
            } catch (_: IllegalArgumentException) {
                errors.add("Invalid Status '$statusStr'. Valid values: ${ApplicationStatus.entries.joinToString(", ") { it.name }}")
            }
        }

        val licenceTypeStr = data["LicenceType"]
        if (!licenceTypeStr.isNullOrBlank()) {
            try {
                LicenceType.valueOf(licenceTypeStr)
            } catch (_: IllegalArgumentException) {
                errors.add("Invalid LicenceType '$licenceTypeStr'. Valid values: ${LicenceType.entries.joinToString(", ") { it.name }}")
            }
        }

        val maxSeats = data["MaxSeats"]
        if (!maxSeats.isNullOrBlank()) {
            try {
                maxSeats.toInt()
            } catch (_: NumberFormatException) {
                errors.add("MaxSeats '$maxSeats' is not a valid integer")
            }
        }

        val usedSeats = data["UsedSeats"]
        if (!usedSeats.isNullOrBlank()) {
            try {
                usedSeats.toInt()
            } catch (_: NumberFormatException) {
                errors.add("UsedSeats '$usedSeats' is not a valid integer")
            }
        }

        val purchaseDate = data["PurchaseDate"]
        if (!purchaseDate.isNullOrBlank()) {
            if (parseDate(purchaseDate) == null) errors.add("PurchaseDate '$purchaseDate' is not a valid date")
        }

        val expiryDate = data["ExpiryDate"]
        if (!expiryDate.isNullOrBlank()) {
            if (parseDate(expiryDate) == null) errors.add("ExpiryDate '$expiryDate' is not a valid date")
        }

        val purchaseCost = data["PurchaseCost"]
        if (!purchaseCost.isNullOrBlank()) {
            try {
                BigDecimal(purchaseCost)
            } catch (_: NumberFormatException) {
                errors.add("PurchaseCost '$purchaseCost' is not a valid number")
            }
        }

        val autoRenewal = data["AutoRenewal"]
        if (!autoRenewal.isNullOrBlank()) {
            if (!isValidBoolean(autoRenewal)) errors.add("AutoRenewal '$autoRenewal' is not a valid boolean (true/false/yes/no/1/0)")
        }

        return errors
    }

    // ========================================================================
    // Import helpers
    // ========================================================================

    private fun importLocation(data: Map<String, String?>) {
        val location = Location(
            name = data["Name"]!!,
            address = data["Address"],
            city = data["City"],
            country = data["Country"]
        )
        locationRepository.save(location)

        auditService.log(AuditEntry(
            action = "Created",
            entityType = "Location",
            entityId = location.id.toString(),
            entityName = location.name,
            details = "Imported location \"${location.name}\" via CSV",
            actorId = currentUserService.userId,
            actorName = currentUserService.userName
        ))
    }

    private fun importPerson(data: Map<String, String?>) {
        val locationName = data["Location"]
        val location = if (!locationName.isNullOrBlank()) findLocationByName(locationName) else null

        val person = Person(
            fullName = data["FullName"]!!,
            email = data["Email"],
            department = data["Department"],
            jobTitle = data["JobTitle"],
            locationId = location?.id
        )
        personRepository.save(person)

        auditService.log(AuditEntry(
            action = "Created",
            entityType = "Person",
            entityId = person.id.toString(),
            entityName = person.fullName,
            details = "Imported person \"${person.fullName}\" via CSV",
            actorId = currentUserService.userId,
            actorName = currentUserService.userName
        ))
    }

    private fun importAsset(data: Map<String, String?>) {
        val assetType = findAssetTypeByName(data["AssetType"]!!)!!
        val locationName = data["Location"]
        val location = if (!locationName.isNullOrBlank()) findLocationByName(locationName) else null
        val assignedToName = data["AssignedTo"]
        val person = if (!assignedToName.isNullOrBlank()) findPersonByName(assignedToName) else null

        val statusStr = data["Status"]
        val status = if (!statusStr.isNullOrBlank()) {
            try { AssetStatus.valueOf(statusStr) } catch (_: IllegalArgumentException) { AssetStatus.Available }
        } else {
            if (person != null) AssetStatus.Assigned else AssetStatus.Available
        }

        val asset = Asset(
            name = data["Name"]!!,
            assetTag = data["AssetTag"]!!,
            serialNumber = data["SerialNumber"],
            assetTypeId = assetType.id,
            status = status,
            locationId = location?.id,
            assignedPersonId = person?.id,
            purchaseDate = data["PurchaseDate"]?.let { parseDate(it) },
            purchaseCost = data["PurchaseCost"]?.let { BigDecimal(it) },
            warrantyExpiryDate = data["WarrantyExpiryDate"]?.let { parseDate(it) },
            depreciationMonths = data["DepreciationMonths"]?.toIntOrNull(),
            notes = data["Notes"]
        )
        assetRepository.save(asset)

        auditService.log(AuditEntry(
            action = "Created",
            entityType = "Asset",
            entityId = asset.id.toString(),
            entityName = asset.name,
            details = "Imported asset \"${asset.name}\" (${asset.assetTag}) via CSV",
            actorId = currentUserService.userId,
            actorName = currentUserService.userName
        ))
    }

    private fun importCertificate(data: Map<String, String?>) {
        val certType = findCertificateTypeByName(data["CertificateType"]!!)!!

        val statusStr = data["Status"]
        val status = if (!statusStr.isNullOrBlank()) {
            try { CertificateStatus.valueOf(statusStr) } catch (_: IllegalArgumentException) { CertificateStatus.Active }
        } else {
            CertificateStatus.Active
        }

        val certificate = Certificate(
            name = data["Name"]!!,
            certificateTypeId = certType.id,
            issuer = data["Issuer"],
            subject = data["Subject"],
            thumbprint = data["Thumbprint"],
            serialNumber = data["SerialNumber"],
            issuedDate = data["IssuedDate"]?.let { parseDate(it) },
            expiryDate = data["ExpiryDate"]?.let { parseDate(it) },
            status = status,
            autoRenewal = data["AutoRenewal"]?.let { parseBoolean(it) } ?: false,
            notes = data["Notes"]
        )
        certificateRepository.save(certificate)

        auditService.log(AuditEntry(
            action = "Created",
            entityType = "Certificate",
            entityId = certificate.id.toString(),
            entityName = certificate.name,
            details = "Imported certificate \"${certificate.name}\" via CSV",
            actorId = currentUserService.userId,
            actorName = currentUserService.userName
        ))
    }

    private fun importApplication(data: Map<String, String?>) {
        val appType = findApplicationTypeByName(data["ApplicationType"]!!)!!

        val statusStr = data["Status"]
        val status = if (!statusStr.isNullOrBlank()) {
            try { ApplicationStatus.valueOf(statusStr) } catch (_: IllegalArgumentException) { ApplicationStatus.Active }
        } else {
            ApplicationStatus.Active
        }

        val licenceTypeStr = data["LicenceType"]
        val licenceType = if (!licenceTypeStr.isNullOrBlank()) {
            try { LicenceType.valueOf(licenceTypeStr) } catch (_: IllegalArgumentException) { null }
        } else null

        val application = Application(
            name = data["Name"]!!,
            applicationTypeId = appType.id,
            publisher = data["Publisher"],
            version = data["Version"],
            licenceKey = data["LicenceKey"],
            licenceType = licenceType,
            maxSeats = data["MaxSeats"]?.toIntOrNull(),
            usedSeats = data["UsedSeats"]?.toIntOrNull(),
            purchaseDate = data["PurchaseDate"]?.let { parseDate(it) },
            expiryDate = data["ExpiryDate"]?.let { parseDate(it) },
            purchaseCost = data["PurchaseCost"]?.let { BigDecimal(it) },
            autoRenewal = data["AutoRenewal"]?.let { parseBoolean(it) } ?: false,
            status = status,
            notes = data["Notes"]
        )
        applicationRepository.save(application)

        auditService.log(AuditEntry(
            action = "Created",
            entityType = "Application",
            entityId = application.id.toString(),
            entityName = application.name,
            details = "Imported application \"${application.name}\" via CSV",
            actorId = currentUserService.userId,
            actorName = currentUserService.userName
        ))
    }

    // ========================================================================
    // Lookup helpers
    // ========================================================================

    private fun findLocationByName(name: String): Location? {
        val spec = org.springframework.data.jpa.domain.Specification<Location> { root, _, cb ->
            cb.and(
                cb.equal(cb.lower(root.get("name")), name.lowercase()),
                cb.equal(root.get<Boolean>("isArchived"), false)
            )
        }
        return locationRepository.findAll(spec).firstOrNull()
    }

    private fun findPersonByName(name: String): Person? {
        val spec = org.springframework.data.jpa.domain.Specification<Person> { root, _, cb ->
            cb.and(
                cb.equal(cb.lower(root.get("fullName")), name.lowercase()),
                cb.equal(root.get<Boolean>("isArchived"), false)
            )
        }
        return personRepository.findAll(spec).firstOrNull()
    }

    private fun findAssetTypeByName(name: String): AssetType? {
        val spec = org.springframework.data.jpa.domain.Specification<AssetType> { root, _, cb ->
            cb.and(
                cb.equal(cb.lower(root.get("name")), name.lowercase()),
                cb.equal(root.get<Boolean>("isArchived"), false)
            )
        }
        return assetTypeRepository.findAll(spec).firstOrNull()
    }

    private fun findCertificateTypeByName(name: String): CertificateType? {
        val spec = org.springframework.data.jpa.domain.Specification<CertificateType> { root, _, cb ->
            cb.and(
                cb.equal(cb.lower(root.get("name")), name.lowercase()),
                cb.equal(root.get<Boolean>("isArchived"), false)
            )
        }
        return certificateTypeRepository.findAll(spec).firstOrNull()
    }

    private fun findApplicationTypeByName(name: String): ApplicationType? {
        val spec = org.springframework.data.jpa.domain.Specification<ApplicationType> { root, _, cb ->
            cb.and(
                cb.equal(cb.lower(root.get("name")), name.lowercase()),
                cb.equal(root.get<Boolean>("isArchived"), false)
            )
        }
        return applicationTypeRepository.findAll(spec).firstOrNull()
    }

    // ========================================================================
    // Parsing helpers
    // ========================================================================

    private fun parseDate(value: String): Instant? {
        for (formatter in DATE_FORMATTERS) {
            try {
                val localDate = LocalDate.parse(value, formatter)
                return localDate.atStartOfDay(ZoneOffset.UTC).toInstant()
            } catch (_: DateTimeParseException) {
                // try next
            }
        }
        // Try parsing as ISO Instant directly
        return try {
            Instant.parse(value)
        } catch (_: DateTimeParseException) {
            null
        }
    }

    private fun isValidBoolean(value: String): Boolean {
        return value.lowercase() in setOf("true", "false", "yes", "no", "1", "0")
    }

    private fun parseBoolean(value: String): Boolean {
        return value.lowercase() in setOf("true", "yes", "1")
    }
}
