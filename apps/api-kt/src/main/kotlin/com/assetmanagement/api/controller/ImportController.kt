package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.*
import com.assetmanagement.api.model.enums.*
import com.assetmanagement.api.repository.*
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
import com.opencsv.CSVReaderBuilder
import com.assetmanagement.api.util.CsvExport
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.io.InputStreamReader
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.*

@RestController
@RequestMapping("/api/v1/import")
@PreAuthorize("hasRole('Admin')")
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
        private const val MAX_IMPORT_ROWS = 10000
        private val VALID_ENTITY_TYPES = setOf("locations", "people", "assets", "certificates", "applications")

        private val LOCATION_HEADERS = arrayOf("Name", "Address", "City", "Country")
        private val PEOPLE_HEADERS = arrayOf("FullName", "Email", "Department", "JobTitle", "Location")
        private val ASSET_HEADERS = arrayOf(
            "Name", "SerialNumber", "AssetType", "Status",
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

        return CsvExport.toResponseEntity("${entityType}-template.csv") { writer ->
            writer.writeNext(headers)
        }
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

        if (dataRows.size > MAX_IMPORT_ROWS) {
            return ResponseEntity.badRequest().body(mapOf("error" to "CSV exceeds maximum of $MAX_IMPORT_ROWS rows"))
        }

        // Load the name→entity lookup maps once for the whole file rather than
        // issuing a query per row per referenced entity (an N+1 that scaled with
        // row count × referenced-entity count).
        val lookups = buildLookups(entityType)

        val rows = dataRows.mapIndexed { index, row ->
            val data = mutableMapOf<String, String?>()
            headers.forEachIndexed { colIndex, header ->
                data[header] = if (colIndex < row.size) row[colIndex].trim().ifBlank { null } else null
            }

            val errors = when (entityType) {
                "locations" -> validateLocation(data)
                "people" -> validatePerson(data, lookups)
                "assets" -> validateAsset(data, lookups)
                "certificates" -> validateCertificate(data, lookups)
                "applications" -> validateApplication(data, lookups)
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
    @Transactional
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

        if (dataRows.size > MAX_IMPORT_ROWS) {
            return ResponseEntity.badRequest().body(mapOf("error" to "CSV exceeds maximum of $MAX_IMPORT_ROWS rows"))
        }

        var imported = 0
        var skipped = 0
        var failed = 0
        val errors = mutableListOf<String>()

        // Load the name→entity lookup maps once (see validate() for the N+1 note).
        val lookups = buildLookups(entityType)

        dataRows.forEachIndexed { index, row ->
            val rowNum = index + 2
            val data = mutableMapOf<String, String?>()
            headers.forEachIndexed { colIndex, header ->
                data[header] = if (colIndex < row.size) row[colIndex].trim().ifBlank { null } else null
            }

            val validationErrors = when (entityType) {
                "locations" -> validateLocation(data)
                "people" -> validatePerson(data, lookups)
                "assets" -> validateAsset(data, lookups)
                "certificates" -> validateCertificate(data, lookups)
                "applications" -> validateApplication(data, lookups)
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
                    "people" -> importPerson(data, lookups)
                    "assets" -> importAsset(data, lookups)
                    "certificates" -> importCertificate(data, lookups)
                    "applications" -> importApplication(data, lookups)
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

    private fun validatePerson(data: Map<String, String?>, lookups: Lookups): List<String> {
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
            if (lookups.location(locationName) == null) errors.add("Location '$locationName' not found")
        }

        return errors
    }

    private fun validateAsset(data: Map<String, String?>, lookups: Lookups): List<String> {
        val errors = mutableListOf<String>()

        val name = data["Name"]
        if (name.isNullOrBlank()) errors.add("Name is required")
        else if (name.length > 200) errors.add("Name must be 200 characters or less")

        val assetTypeName = data["AssetType"]
        if (assetTypeName.isNullOrBlank()) errors.add("AssetType is required")
        else {
            if (lookups.assetType(assetTypeName) == null) errors.add("AssetType '$assetTypeName' not found")
        }

        val statusStr = data["Status"]
        if (!statusStr.isNullOrBlank()) {
            val normalized = normalizeAssetStatus(statusStr)
            try {
                AssetStatus.valueOf(normalized)
            } catch (_: IllegalArgumentException) {
                errors.add("Invalid Status '$statusStr'. Valid values: ${AssetStatus.entries.joinToString(", ") { it.name }}")
            }
        }

        val locationName = data["Location"]
        if (!locationName.isNullOrBlank()) {
            if (lookups.location(locationName) == null) errors.add("Location '$locationName' not found")
        }

        val assignedTo = data["AssignedTo"]
        if (!assignedTo.isNullOrBlank()) {
            if (lookups.person(assignedTo) == null) errors.add("Person '$assignedTo' not found")
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

    private fun validateCertificate(data: Map<String, String?>, lookups: Lookups): List<String> {
        val errors = mutableListOf<String>()

        val name = data["Name"]
        if (name.isNullOrBlank()) errors.add("Name is required")
        else if (name.length > 200) errors.add("Name must be 200 characters or less")

        val certTypeName = data["CertificateType"]
        if (certTypeName.isNullOrBlank()) errors.add("CertificateType is required")
        else {
            if (lookups.certType(certTypeName) == null) errors.add("CertificateType '$certTypeName' not found")
        }

        val statusStr = data["Status"]
        if (!statusStr.isNullOrBlank()) {
            val normalized = normalizeCertificateStatus(statusStr)
            try {
                CertificateStatus.valueOf(normalized)
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

    private fun validateApplication(data: Map<String, String?>, lookups: Lookups): List<String> {
        val errors = mutableListOf<String>()

        val name = data["Name"]
        if (name.isNullOrBlank()) errors.add("Name is required")
        else if (name.length > 200) errors.add("Name must be 200 characters or less")

        val appTypeName = data["ApplicationType"]
        if (appTypeName.isNullOrBlank()) errors.add("ApplicationType is required")
        else {
            if (lookups.appType(appTypeName) == null) errors.add("ApplicationType '$appTypeName' not found")
        }

        val statusStr = data["Status"]
        if (!statusStr.isNullOrBlank()) {
            val normalized = normalizeApplicationStatus(statusStr)
            try {
                ApplicationStatus.valueOf(normalized)
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
        val name = data["Name"] ?: throw org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Missing required field: Name")
        val location = Location(
            name = name,
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

    private fun importPerson(data: Map<String, String?>, lookups: Lookups) {
        val locationName = data["Location"]
        val location = if (!locationName.isNullOrBlank()) lookups.location(locationName) else null

        val fullName = data["FullName"] ?: throw org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Missing required field: FullName")
        val person = Person(
            fullName = fullName,
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

    private fun importAsset(data: Map<String, String?>, lookups: Lookups) {
        val assetTypeName = data["AssetType"] ?: throw org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Missing required field: AssetType")
        val assetType = lookups.assetType(assetTypeName) ?: throw org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "AssetType '$assetTypeName' not found")
        val locationName = data["Location"]
        val location = if (!locationName.isNullOrBlank()) lookups.location(locationName) else null
        val assignedToName = data["AssignedTo"]
        val person = if (!assignedToName.isNullOrBlank()) lookups.person(assignedToName) else null

        val statusStr = data["Status"]
        val status = if (!statusStr.isNullOrBlank()) {
            val normalized = normalizeAssetStatus(statusStr)
            try { AssetStatus.valueOf(normalized) } catch (_: IllegalArgumentException) { AssetStatus.Available }
        } else {
            if (person != null) AssetStatus.Assigned else AssetStatus.Available
        }

        val asset = Asset(
            name = data["Name"] ?: throw org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Missing required field: Name"),
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
            details = "Imported asset \"${asset.name}\" via CSV",
            actorId = currentUserService.userId,
            actorName = currentUserService.userName
        ))
    }

    private fun importCertificate(data: Map<String, String?>, lookups: Lookups) {
        val certTypeName = data["CertificateType"] ?: throw org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Missing required field: CertificateType")
        val certType = lookups.certType(certTypeName) ?: throw org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "CertificateType '$certTypeName' not found")

        val statusStr = data["Status"]
        val status = if (!statusStr.isNullOrBlank()) {
            val normalized = normalizeCertificateStatus(statusStr)
            try { CertificateStatus.valueOf(normalized) } catch (_: IllegalArgumentException) { CertificateStatus.Active }
        } else {
            CertificateStatus.Active
        }

        val certificate = Certificate(
            name = data["Name"] ?: throw org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Missing required field: Name"),
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

    private fun importApplication(data: Map<String, String?>, lookups: Lookups) {
        val appTypeName = data["ApplicationType"] ?: throw org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Missing required field: ApplicationType")
        val appType = lookups.appType(appTypeName) ?: throw org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "ApplicationType '$appTypeName' not found")

        val statusStr = data["Status"]
        val status = if (!statusStr.isNullOrBlank()) {
            val normalized = normalizeApplicationStatus(statusStr)
            try { ApplicationStatus.valueOf(normalized) } catch (_: IllegalArgumentException) { ApplicationStatus.Active }
        } else {
            ApplicationStatus.Active
        }

        val licenceTypeStr = data["LicenceType"]
        val licenceType = if (!licenceTypeStr.isNullOrBlank()) {
            try { LicenceType.valueOf(licenceTypeStr) } catch (_: IllegalArgumentException) { null }
        } else null

        val application = Application(
            name = data["Name"] ?: throw org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Missing required field: Name"),
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
    // Lookup maps
    // ========================================================================

    /**
     * Name→entity maps for the references an import may need, loaded once per
     * request. Lookups are case-insensitive (keys lowercased); on the rare
     * duplicate name the last row loaded wins, matching the previous
     * `findAll(...).firstOrNull()`'s unordered "any match".
     */
    private class Lookups(
        private val locations: Map<String, Location> = emptyMap(),
        private val people: Map<String, Person> = emptyMap(),
        private val assetTypes: Map<String, AssetType> = emptyMap(),
        private val certTypes: Map<String, CertificateType> = emptyMap(),
        private val appTypes: Map<String, ApplicationType> = emptyMap(),
    ) {
        fun location(name: String?): Location? = name?.let { locations[it.lowercase()] }
        fun person(name: String?): Person? = name?.let { people[it.lowercase()] }
        fun assetType(name: String?): AssetType? = name?.let { assetTypes[it.lowercase()] }
        fun certType(name: String?): CertificateType? = name?.let { certTypes[it.lowercase()] }
        fun appType(name: String?): ApplicationType? = name?.let { appTypes[it.lowercase()] }
    }

    /** Loads only the lookup maps the given entity type actually references. */
    private fun buildLookups(entityType: String): Lookups = when (entityType) {
        "people" -> Lookups(locations = locationMap())
        "assets" -> Lookups(locations = locationMap(), people = personMap(), assetTypes = assetTypeMap())
        "certificates" -> Lookups(certTypes = certTypeMap())
        "applications" -> Lookups(appTypes = appTypeMap())
        else -> Lookups()
    }

    private fun <T> nonArchivedSpec(): org.springframework.data.jpa.domain.Specification<T> =
        org.springframework.data.jpa.domain.Specification { root, _, cb ->
            cb.equal(root.get<Boolean>("isArchived"), false)
        }

    private fun locationMap(): Map<String, Location> =
        locationRepository.findAll(nonArchivedSpec<Location>()).associateBy { it.name.lowercase() }

    private fun personMap(): Map<String, Person> =
        personRepository.findAll(nonArchivedSpec<Person>()).associateBy { it.fullName.lowercase() }

    private fun assetTypeMap(): Map<String, AssetType> =
        assetTypeRepository.findAll(nonArchivedSpec<AssetType>()).associateBy { it.name.lowercase() }

    private fun certTypeMap(): Map<String, CertificateType> =
        certificateTypeRepository.findAll(nonArchivedSpec<CertificateType>()).associateBy { it.name.lowercase() }

    private fun appTypeMap(): Map<String, ApplicationType> =
        applicationTypeRepository.findAll(nonArchivedSpec<ApplicationType>()).associateBy { it.name.lowercase() }

    // ========================================================================
    // Status normalization helpers
    // ========================================================================

    private fun normalizeAssetStatus(raw: String): String {
        return when (raw.lowercase().trim()) {
            "active" -> "Available"
            "in use", "inuse" -> "Assigned"
            "maintenance", "in maintenance" -> "InMaintenance"
            "checked out", "checkedout" -> "CheckedOut"
            "retired" -> "Retired"
            "sold" -> "Sold"
            "archived" -> "Archived"
            else -> raw
        }
    }

    private fun normalizeCertificateStatus(raw: String): String {
        return when (raw.lowercase().trim()) {
            "active" -> "Active"
            "expired" -> "Expired"
            "revoked" -> "Revoked"
            "pending renewal", "pendingrenewal", "pending" -> "PendingRenewal"
            else -> raw
        }
    }

    private fun normalizeApplicationStatus(raw: String): String {
        return when (raw.lowercase().trim()) {
            "active" -> "Active"
            "expired" -> "Expired"
            "suspended" -> "Suspended"
            "pending renewal", "pendingrenewal", "pending" -> "PendingRenewal"
            "inactive" -> "Inactive"
            else -> raw
        }
    }

    // ========================================================================
    // Parsing helpers
    // ========================================================================

    private fun parseDate(value: String): LocalDate? {
        for (formatter in DATE_FORMATTERS) {
            try {
                return LocalDate.parse(value, formatter)
            } catch (_: DateTimeParseException) {
                // try next
            }
        }
        // Tolerate a full ISO instant ("2026-01-01T00:00:00Z") by keeping the date part.
        return try {
            LocalDate.parse(value.take(10))
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
