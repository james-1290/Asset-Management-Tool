package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.Application
import com.assetmanagement.api.model.CustomFieldValue
import com.assetmanagement.api.model.enums.ApplicationHistoryEventType
import com.assetmanagement.api.model.enums.ApplicationStatus
import com.assetmanagement.api.model.enums.LicenceType
import com.assetmanagement.api.repository.*
import com.assetmanagement.api.service.*
import com.opencsv.CSVWriter
import jakarta.persistence.criteria.Predicate
import jakarta.servlet.http.HttpServletResponse
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.io.OutputStreamWriter
import java.math.BigDecimal
import java.net.URI
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.*

@RestController
@RequestMapping("/api/v1/applications")
class ApplicationsController(
    private val applicationRepository: ApplicationRepository,
    private val applicationTypeRepository: ApplicationTypeRepository,
    private val assetRepository: AssetRepository,
    private val personRepository: PersonRepository,
    private val locationRepository: LocationRepository,
    private val customFieldDefinitionRepository: CustomFieldDefinitionRepository,
    private val customFieldValueRepository: CustomFieldValueRepository,
    private val applicationHistoryRepository: ApplicationHistoryRepository,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService
) {
    private val dateFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneOffset.UTC)
    private val dateOnlyFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneOffset.UTC)

    // ── GET / ── Paged list ─────────────────────────────────────────────

    @GetMapping
    fun getAll(
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "25") pageSize: Int,
        @RequestParam(required = false) search: String?,
        @RequestParam(required = false) status: String?,
        @RequestParam(required = false) includeStatuses: String?,
        @RequestParam(defaultValue = "name") sortBy: String,
        @RequestParam(defaultValue = "asc") sortDir: String,
        @RequestParam(required = false) typeId: UUID?
    ): ResponseEntity<Any> {
        val p = maxOf(1, page)
        val ps = pageSize.coerceIn(1, 100)

        // Validate status filter
        if (!status.isNullOrBlank()) {
            val parsed = runCatching { ApplicationStatus.valueOf(status) }.getOrNull()
                ?: return ResponseEntity.badRequest().body(mapOf("error" to "Invalid status: $status"))
        }

        val spec = buildSpec(search, status, includeStatuses, typeId)
        val sort = sortOf(sortBy, sortDir)
        val result = applicationRepository.findAll(spec, PageRequest.of(p - 1, ps, sort))

        // Load custom field values in bulk
        val appIds = result.content.map { it.id }
        val cfvsByEntity = if (appIds.isNotEmpty()) {
            customFieldValueRepository.findByEntityIdIn(appIds).groupBy { it.entityId }
        } else {
            emptyMap()
        }

        val items = result.content.map { it.toDto(cfvsByEntity[it.id]) }
        return ResponseEntity.ok(PagedResponse(items, p, ps, result.totalElements))
    }

    // ── GET /export ── CSV export ───────────────────────────────────────

    @GetMapping("/export")
    fun export(
        @RequestParam(required = false) search: String?,
        @RequestParam(required = false) status: String?,
        @RequestParam(required = false) includeStatuses: String?,
        @RequestParam(defaultValue = "name") sortBy: String,
        @RequestParam(defaultValue = "asc") sortDir: String,
        @RequestParam(required = false) typeId: UUID?,
        @RequestParam(required = false) ids: String?,
        response: HttpServletResponse
    ) {
        response.contentType = "text/csv"
        response.setHeader("Content-Disposition", "attachment; filename=applications-export.csv")

        val applications: Iterable<Application> = if (!ids.isNullOrBlank()) {
            val idList = ids.split(",").mapNotNull { runCatching { UUID.fromString(it.trim()) }.getOrNull() }
            applicationRepository.findAllById(idList).filter { !it.isArchived }
        } else {
            val spec = buildSpec(search, status, includeStatuses, typeId)
            applicationRepository.findAll(spec, sortOf(sortBy, sortDir))
        }

        val writer = CSVWriter(OutputStreamWriter(response.outputStream))
        writer.writeNext(
            arrayOf(
                "Name", "ApplicationType", "Status", "Publisher", "Version",
                "LicenceKey", "LicenceType", "MaxSeats", "UsedSeats",
                "ExpiryDate", "PurchaseCost", "AutoRenewal", "Notes",
                "CreatedAt", "UpdatedAt"
            )
        )
        applications.forEach { a ->
            writer.writeNext(
                arrayOf(
                    a.name,
                    a.applicationType?.name ?: "",
                    a.status.name,
                    a.publisher ?: "",
                    a.version ?: "",
                    a.licenceKey ?: "",
                    a.licenceType?.name ?: "",
                    a.maxSeats?.toString() ?: "",
                    a.usedSeats?.toString() ?: "",
                    a.expiryDate?.let { dateOnlyFormat.format(it) } ?: "",
                    a.purchaseCost?.let { String.format("%.2f", it) } ?: "",
                    a.autoRenewal.toString(),
                    a.notes ?: "",
                    dateFormat.format(a.createdAt),
                    dateFormat.format(a.updatedAt)
                )
            )
        }
        writer.flush()
    }

    // ── GET /{id} ── Get by ID ──────────────────────────────────────────

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<Any> {
        val app = applicationRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        val cfvs = loadCustomFieldValues(app.id)
        return ResponseEntity.ok(app.toDto(cfvs))
    }

    // ── POST / ── Create ────────────────────────────────────────────────

    @PostMapping
    fun create(@RequestBody request: CreateApplicationRequest): ResponseEntity<Any> {
        // Validate application type
        val appType = applicationTypeRepository.findById(request.applicationTypeId).orElse(null)
        if (appType == null || appType.isArchived)
            return ResponseEntity.badRequest().body(mapOf("error" to "Application type not found."))

        // Validate asset
        if (request.assetId != null) {
            val asset = assetRepository.findById(request.assetId).orElse(null)
            if (asset == null || asset.isArchived)
                return ResponseEntity.badRequest().body(mapOf("error" to "Asset not found."))
        }

        // Validate person
        if (request.personId != null) {
            val person = personRepository.findById(request.personId).orElse(null)
            if (person == null || person.isArchived)
                return ResponseEntity.badRequest().body(mapOf("error" to "Person not found."))
        }

        // Validate location
        if (request.locationId != null) {
            val location = locationRepository.findById(request.locationId).orElse(null)
            if (location == null || location.isArchived)
                return ResponseEntity.badRequest().body(mapOf("error" to "Location not found."))
        }

        // Parse status
        val appStatus = if (!request.status.isNullOrBlank()) {
            runCatching { ApplicationStatus.valueOf(request.status) }.getOrNull()
                ?: return ResponseEntity.badRequest().body(mapOf("error" to "Invalid status: ${request.status}"))
        } else {
            ApplicationStatus.Active
        }

        // Parse licence type
        val licenceType: LicenceType? = if (!request.licenceType.isNullOrBlank()) {
            runCatching { LicenceType.valueOf(request.licenceType) }.getOrNull()
                ?: return ResponseEntity.badRequest().body(mapOf("error" to "Invalid licence type: ${request.licenceType}"))
        } else {
            null
        }

        val app = Application(
            name = request.name,
            applicationTypeId = request.applicationTypeId,
            publisher = request.publisher,
            version = request.version,
            licenceKey = request.licenceKey,
            licenceType = licenceType,
            maxSeats = request.maxSeats,
            usedSeats = request.usedSeats,
            purchaseDate = request.purchaseDate,
            expiryDate = request.expiryDate,
            purchaseCost = request.purchaseCost,
            autoRenewal = request.autoRenewal,
            status = appStatus,
            notes = request.notes,
            assetId = request.assetId,
            personId = request.personId,
            locationId = request.locationId
        )
        applicationRepository.save(app)

        // Save custom field values
        if (!request.customFieldValues.isNullOrEmpty()) {
            val validDefIds = customFieldDefinitionRepository
                .findByApplicationTypeIdAndIsArchivedFalse(request.applicationTypeId)
                .map { it.id }
                .toSet()

            for (cfv in request.customFieldValues) {
                if (!validDefIds.contains(cfv.fieldDefinitionId))
                    return ResponseEntity.badRequest().body(
                        mapOf("error" to "Custom field definition ${cfv.fieldDefinitionId} not found for this application type.")
                    )

                customFieldValueRepository.save(
                    CustomFieldValue(
                        customFieldDefinitionId = cfv.fieldDefinitionId,
                        entityId = app.id,
                        value = cfv.value
                    )
                )
            }
        }

        auditService.log(
            AuditEntry(
                action = "Created",
                entityType = "Application",
                entityId = app.id.toString(),
                entityName = app.name,
                details = "Created application \"${app.name}\"",
                actorId = currentUserService.userId,
                actorName = currentUserService.userName
            )
        )

        // Reload with relations
        val saved = applicationRepository.findById(app.id).get()
        val cfvs = loadCustomFieldValues(saved.id)

        return ResponseEntity.created(URI("/api/v1/applications/${saved.id}")).body(saved.toDto(cfvs))
    }

    // ── PUT /{id} ── Update with full change tracking ───────────────────

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody request: UpdateApplicationRequest): ResponseEntity<Any> {
        val app = applicationRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        val existingCfvs = loadCustomFieldValues(app.id)

        // Validate application type
        val appType = applicationTypeRepository.findById(request.applicationTypeId).orElse(null)
        if (appType == null || appType.isArchived)
            return ResponseEntity.badRequest().body(mapOf("error" to "Application type not found."))

        // Validate asset
        if (request.assetId != null) {
            val asset = assetRepository.findById(request.assetId).orElse(null)
            if (asset == null || asset.isArchived)
                return ResponseEntity.badRequest().body(mapOf("error" to "Asset not found."))
        }

        // Validate person
        if (request.personId != null) {
            val person = personRepository.findById(request.personId).orElse(null)
            if (person == null || person.isArchived)
                return ResponseEntity.badRequest().body(mapOf("error" to "Person not found."))
        }

        // Validate location
        if (request.locationId != null) {
            val location = locationRepository.findById(request.locationId).orElse(null)
            if (location == null || location.isArchived)
                return ResponseEntity.badRequest().body(mapOf("error" to "Location not found."))
        }

        // Parse status
        var newStatus: ApplicationStatus? = null
        if (!request.status.isNullOrBlank()) {
            newStatus = runCatching { ApplicationStatus.valueOf(request.status) }.getOrNull()
                ?: return ResponseEntity.badRequest().body(mapOf("error" to "Invalid status: ${request.status}"))
        }

        // Parse licence type (empty string = clear)
        var newLicenceType: LicenceType? = null
        var licenceTypeChanged = false
        if (request.licenceType != null) {
            if (request.licenceType == "") {
                if (app.licenceType != null) licenceTypeChanged = true
            } else {
                val parsed = runCatching { LicenceType.valueOf(request.licenceType) }.getOrNull()
                    ?: return ResponseEntity.badRequest().body(mapOf("error" to "Invalid licence type: ${request.licenceType}"))
                newLicenceType = parsed
                if (newLicenceType != app.licenceType) licenceTypeChanged = true
            }
        }

        // Build change tracking list
        val changes = mutableListOf<AuditChange>()

        track(changes, "Name", app.name, request.name)
        track(changes, "Publisher", app.publisher, request.publisher)
        track(changes, "Version", app.version, request.version)
        track(changes, "LicenceKey", app.licenceKey, request.licenceKey)
        track(changes, "Notes", app.notes, request.notes)

        if (newStatus != null && newStatus != app.status)
            changes.add(AuditChange("Status", app.status.name, newStatus.name))

        if (licenceTypeChanged)
            changes.add(AuditChange("Licence Type", app.licenceType?.name, newLicenceType?.name))

        if (request.applicationTypeId != app.applicationTypeId) {
            val oldTypeName = app.applicationType?.name
            val newTypeName = appType.name
            changes.add(AuditChange("Type", oldTypeName, newTypeName))
        }

        trackDate(changes, "Purchase Date", app.purchaseDate, request.purchaseDate)
        trackDate(changes, "Expiry Date", app.expiryDate, request.expiryDate)
        trackBool(changes, "Auto Renewal", app.autoRenewal, request.autoRenewal)
        trackInt(changes, "Max Seats", app.maxSeats, request.maxSeats)
        trackInt(changes, "Used Seats", app.usedSeats, request.usedSeats)
        trackDecimal(changes, "Purchase Cost", app.purchaseCost, request.purchaseCost)

        if (request.assetId != app.assetId) {
            val oldName = app.asset?.name
            var newName: String? = null
            if (request.assetId != null) {
                newName = assetRepository.findById(request.assetId).orElse(null)?.name
            }
            changes.add(AuditChange("Asset", oldName, newName))
        }

        if (request.personId != app.personId) {
            val oldName = app.person?.fullName
            var newName: String? = null
            if (request.personId != null) {
                newName = personRepository.findById(request.personId).orElse(null)?.fullName
            }
            changes.add(AuditChange("Person", oldName, newName))
        }

        if (request.locationId != app.locationId) {
            val oldName = app.location?.name
            var newName: String? = null
            if (request.locationId != null) {
                newName = locationRepository.findById(request.locationId).orElse(null)?.name
            }
            changes.add(AuditChange("Location", oldName, newName))
        }

        // Apply changes
        app.name = request.name
        app.applicationTypeId = request.applicationTypeId
        app.publisher = request.publisher
        app.version = request.version
        app.licenceKey = request.licenceKey
        if (licenceTypeChanged) app.licenceType = newLicenceType
        app.maxSeats = request.maxSeats
        app.usedSeats = request.usedSeats
        app.purchaseDate = request.purchaseDate
        app.expiryDate = request.expiryDate
        app.purchaseCost = request.purchaseCost
        app.autoRenewal = request.autoRenewal
        app.notes = request.notes
        app.assetId = request.assetId
        app.personId = request.personId
        app.locationId = request.locationId
        if (newStatus != null) app.status = newStatus
        app.updatedAt = Instant.now()

        // Upsert custom field values
        if (request.customFieldValues != null) {
            val existingByDefId = existingCfvs.associateBy { it.customFieldDefinitionId }

            val validDefIds = customFieldDefinitionRepository
                .findByApplicationTypeIdAndIsArchivedFalse(request.applicationTypeId)
                .map { it.id }
                .toSet()

            for (cfv in request.customFieldValues) {
                if (!validDefIds.contains(cfv.fieldDefinitionId)) continue

                val existing = existingByDefId[cfv.fieldDefinitionId]
                if (existing != null) {
                    if (existing.value != cfv.value) {
                        val defName = existing.customFieldDefinition?.name ?: "Unknown"
                        changes.add(AuditChange("Custom: $defName", existing.value, cfv.value))
                        existing.value = cfv.value
                        existing.updatedAt = Instant.now()
                        customFieldValueRepository.save(existing)
                    }
                } else {
                    customFieldValueRepository.save(
                        CustomFieldValue(
                            customFieldDefinitionId = cfv.fieldDefinitionId,
                            entityId = app.id,
                            value = cfv.value
                        )
                    )
                    val defName = customFieldDefinitionRepository.findById(cfv.fieldDefinitionId).orElse(null)?.name ?: "Unknown"
                    if (!cfv.value.isNullOrBlank()) {
                        changes.add(AuditChange("Custom: $defName", null, cfv.value))
                    }
                }
            }
        }

        applicationRepository.save(app)

        auditService.log(
            AuditEntry(
                action = "Updated",
                entityType = "Application",
                entityId = app.id.toString(),
                entityName = app.name,
                details = "Updated application \"${app.name}\"",
                actorId = currentUserService.userId,
                actorName = currentUserService.userName,
                changes = if (changes.isNotEmpty()) changes else null
            )
        )

        // Reload with relations
        val updated = applicationRepository.findById(app.id).get()
        val updatedCfvs = loadCustomFieldValues(updated.id)
        return ResponseEntity.ok(updated.toDto(updatedCfvs))
    }

    // ── GET /{id}/history ── History timeline ────────────────────────────

    @GetMapping("/{id}/history")
    fun getHistory(
        @PathVariable id: UUID,
        @RequestParam(required = false) limit: Int?
    ): ResponseEntity<Any> {
        if (!applicationRepository.existsById(id)) return ResponseEntity.notFound().build()

        val pageable = PageRequest.of(0, limit ?: 50)
        val history = applicationHistoryRepository
            .findByApplicationIdOrderByTimestampDesc(id, pageable)
            .map { h ->
                ApplicationHistoryDto(
                    h.id,
                    h.eventType.name,
                    h.details,
                    h.timestamp,
                    h.performedByUser?.displayName,
                    h.changes.map { c ->
                        ApplicationHistoryChangeDto(c.fieldName, c.oldValue, c.newValue)
                    }
                )
            }
        return ResponseEntity.ok(history)
    }

    // ── POST /{id}/deactivate ── Deactivate application ─────────────────

    @PostMapping("/{id}/deactivate")
    fun deactivate(
        @PathVariable id: UUID,
        @RequestBody request: DeactivateApplicationRequest
    ): ResponseEntity<Any> {
        val app = applicationRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        if (app.isArchived)
            return ResponseEntity.badRequest().body(mapOf("error" to "Cannot deactivate an archived application."))

        if (app.status == ApplicationStatus.Inactive)
            return ResponseEntity.badRequest().body(mapOf("error" to "Application is already inactive."))

        val oldStatus = app.status
        app.status = ApplicationStatus.Inactive
        app.deactivatedDate = request.deactivatedDate ?: Instant.now()
        app.updatedAt = Instant.now()

        if (!request.notes.isNullOrBlank())
            app.notes = request.notes

        applicationRepository.save(app)

        val changes = listOf(
            AuditChange("Status", oldStatus.name, ApplicationStatus.Inactive.name)
        )

        auditService.log(
            AuditEntry(
                action = "Deactivated",
                entityType = "Application",
                entityId = app.id.toString(),
                entityName = app.name,
                details = "Deactivated application \"${app.name}\"",
                actorId = currentUserService.userId,
                actorName = currentUserService.userName,
                changes = changes
            )
        )

        val reloaded = applicationRepository.findById(app.id).get()
        val cfvs = loadCustomFieldValues(reloaded.id)
        return ResponseEntity.ok(reloaded.toDto(cfvs))
    }

    // ── POST /{id}/reactivate ── Reactivate application ─────────────────

    @PostMapping("/{id}/reactivate")
    fun reactivate(
        @PathVariable id: UUID,
        @RequestBody request: ReactivateApplicationRequest
    ): ResponseEntity<Any> {
        val app = applicationRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        if (app.isArchived)
            return ResponseEntity.badRequest().body(mapOf("error" to "Cannot reactivate an archived application."))

        if (app.status != ApplicationStatus.Inactive)
            return ResponseEntity.badRequest().body(mapOf("error" to "Only inactive applications can be reactivated."))

        app.status = ApplicationStatus.Active
        app.deactivatedDate = null
        app.updatedAt = Instant.now()

        if (!request.notes.isNullOrBlank())
            app.notes = request.notes

        applicationRepository.save(app)

        val changes = listOf(
            AuditChange("Status", ApplicationStatus.Inactive.name, ApplicationStatus.Active.name)
        )

        auditService.log(
            AuditEntry(
                action = "Reactivated",
                entityType = "Application",
                entityId = app.id.toString(),
                entityName = app.name,
                details = "Reactivated application \"${app.name}\"",
                actorId = currentUserService.userId,
                actorName = currentUserService.userName,
                changes = changes
            )
        )

        val reloaded = applicationRepository.findById(app.id).get()
        val cfvs = loadCustomFieldValues(reloaded.id)
        return ResponseEntity.ok(reloaded.toDto(cfvs))
    }

    // ── POST /bulk-archive ── Bulk archive ──────────────────────────────

    @PostMapping("/bulk-archive")
    fun bulkArchive(@RequestBody request: BulkArchiveRequest): ResponseEntity<BulkActionResponse> {
        var succeeded = 0
        var failed = 0
        request.ids.forEach { appId ->
            val app = applicationRepository.findById(appId).orElse(null)
            if (app == null || app.isArchived) {
                failed++
                return@forEach
            }
            app.isArchived = true
            app.updatedAt = Instant.now()
            applicationRepository.save(app)
            auditService.log(
                AuditEntry(
                    action = "Archived",
                    entityType = "Application",
                    entityId = app.id.toString(),
                    entityName = app.name,
                    details = "Bulk archived application \"${app.name}\"",
                    actorId = currentUserService.userId,
                    actorName = currentUserService.userName
                )
            )
            succeeded++
        }
        return ResponseEntity.ok(BulkActionResponse(succeeded, failed))
    }

    // ── POST /bulk-status ── Bulk status change ─────────────────────────

    @PostMapping("/bulk-status")
    fun bulkStatus(@RequestBody request: BulkStatusRequest): ResponseEntity<Any> {
        val newStatus = runCatching { ApplicationStatus.valueOf(request.status) }.getOrNull()
            ?: return ResponseEntity.badRequest().body(mapOf("error" to "Invalid status: ${request.status}"))

        var succeeded = 0
        var failed = 0
        request.ids.forEach { appId ->
            val app = applicationRepository.findById(appId).orElse(null)
            if (app == null || app.isArchived) {
                failed++
                return@forEach
            }
            val oldStatus = app.status
            app.status = newStatus
            app.updatedAt = Instant.now()
            applicationRepository.save(app)
            auditService.log(
                AuditEntry(
                    action = "StatusChanged",
                    entityType = "Application",
                    entityId = app.id.toString(),
                    entityName = app.name,
                    details = "Bulk status change \"${app.name}\": $oldStatus -> $newStatus",
                    actorId = currentUserService.userId,
                    actorName = currentUserService.userName,
                    changes = listOf(AuditChange("Status", oldStatus.name, newStatus.name))
                )
            )
            succeeded++
        }
        return ResponseEntity.ok(BulkActionResponse(succeeded, failed))
    }

    // ── DELETE /{id} ── Archive (soft delete) ───────────────────────────

    @DeleteMapping("/{id}")
    fun archive(@PathVariable id: UUID): ResponseEntity<Any> {
        val app = applicationRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        app.isArchived = true
        app.updatedAt = Instant.now()
        applicationRepository.save(app)

        auditService.log(
            AuditEntry(
                action = "Archived",
                entityType = "Application",
                entityId = app.id.toString(),
                entityName = app.name,
                details = "Archived application \"${app.name}\"",
                actorId = currentUserService.userId,
                actorName = currentUserService.userName
            )
        )

        return ResponseEntity.noContent().build()
    }

    // ── Private helpers ─────────────────────────────────────────────────

    private fun buildSpec(
        search: String?,
        status: String?,
        includeStatuses: String?,
        typeId: UUID?
    ): Specification<Application> = Specification { root, _, cb ->
        val predicates = mutableListOf<Predicate>()
        predicates.add(cb.equal(root.get<Boolean>("isArchived"), false))

        // Filter by typeId
        if (typeId != null) {
            predicates.add(cb.equal(root.get<UUID>("applicationTypeId"), typeId))
        }

        // Search
        if (!search.isNullOrBlank()) {
            val pattern = "%${search.lowercase()}%"
            predicates.add(
                cb.or(
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(root.get("publisher")), pattern)
                )
            )
        }

        // Status filtering
        if (!status.isNullOrBlank()) {
            val parsedStatus = runCatching { ApplicationStatus.valueOf(status) }.getOrNull()
            if (parsedStatus != null) {
                predicates.add(cb.equal(root.get<ApplicationStatus>("status"), parsedStatus))
            }
        } else {
            // By default hide Inactive unless explicitly included
            val hiddenStatuses = mutableSetOf(ApplicationStatus.Inactive)
            if (!includeStatuses.isNullOrBlank()) {
                includeStatuses.split(",").map { it.trim() }.forEach { s ->
                    runCatching { ApplicationStatus.valueOf(s) }.getOrNull()?.let {
                        hiddenStatuses.remove(it)
                    }
                }
            }
            if (hiddenStatuses.isNotEmpty()) {
                predicates.add(cb.not(root.get<ApplicationStatus>("status").`in`(hiddenStatuses)))
            }
        }

        cb.and(*predicates.toTypedArray())
    }

    private fun sortOf(sortBy: String, sortDir: String): Sort {
        val dir = if (sortDir.equals("desc", ignoreCase = true)) Sort.Direction.DESC else Sort.Direction.ASC
        val prop = when (sortBy.lowercase()) {
            "publisher" -> "publisher"
            "licencetype" -> "licenceType"
            "expirydate" -> "expiryDate"
            "status" -> "status"
            "applicationtypename" -> "applicationType.name"
            "createdat" -> "createdAt"
            else -> "name"
        }
        return Sort.by(dir, prop)
    }

    private fun loadCustomFieldValues(appId: UUID): List<CustomFieldValue> {
        return customFieldValueRepository.findByEntityId(appId)
    }

    private fun Application.toDto(cfvs: List<CustomFieldValue>? = null): ApplicationDto {
        return ApplicationDto(
            id = id,
            name = name,
            applicationTypeId = applicationTypeId,
            applicationTypeName = applicationType?.name ?: "",
            publisher = publisher,
            version = version,
            licenceKey = licenceKey,
            licenceType = licenceType?.name,
            maxSeats = maxSeats,
            usedSeats = usedSeats,
            purchaseDate = purchaseDate,
            expiryDate = expiryDate,
            purchaseCost = purchaseCost,
            autoRenewal = autoRenewal,
            status = status.name,
            deactivatedDate = deactivatedDate,
            notes = notes,
            assetId = assetId,
            assetName = asset?.name,
            personId = personId,
            personName = person?.fullName,
            locationId = locationId,
            locationName = location?.name,
            isArchived = isArchived,
            createdAt = createdAt,
            updatedAt = updatedAt,
            customFieldValues = (cfvs ?: emptyList())
                .filter { it.customFieldDefinition?.isArchived == false }
                .map { v ->
                    CustomFieldValueDto(
                        fieldDefinitionId = v.customFieldDefinitionId,
                        fieldName = v.customFieldDefinition?.name ?: "",
                        fieldType = v.customFieldDefinition?.fieldType?.name ?: "",
                        value = v.value
                    )
                }
        )
    }

    // ── POST /check-duplicates ─────────────────────────────────────────
    @PostMapping("/check-duplicates")
    fun checkDuplicates(@RequestBody request: CheckApplicationDuplicatesRequest): ResponseEntity<List<DuplicateCheckResult>> {
        val spec = Specification<Application> { root, _, cb ->
            val predicates = mutableListOf<Predicate>()
            predicates.add(cb.equal(root.get<Boolean>("isArchived"), false))

            if (request.excludeId != null)
                predicates.add(cb.notEqual(root.get<UUID>("id"), request.excludeId))

            val matchConditions = mutableListOf<Predicate>()

            if (!request.licenceKey.isNullOrBlank())
                matchConditions.add(cb.equal(cb.lower(root.get("licenceKey")), request.licenceKey.lowercase()))

            if (!request.name.isNullOrBlank())
                matchConditions.add(cb.like(cb.lower(root.get("name")), "%${request.name.lowercase()}%"))

            if (!request.publisher.isNullOrBlank())
                matchConditions.add(cb.like(cb.lower(root.get("publisher")), "%${request.publisher.lowercase()}%"))

            if (matchConditions.isEmpty())
                return@Specification cb.and(*predicates.toTypedArray(), cb.disjunction())

            predicates.add(cb.or(*matchConditions.toTypedArray()))
            cb.and(*predicates.toTypedArray())
        }

        val results = applicationRepository.findAll(spec, PageRequest.of(0, 5))
            .content.map { DuplicateCheckResult(it.id, it.name, "Publisher: ${it.publisher ?: "N/A"}") }

        return ResponseEntity.ok(results)
    }

    // ── Change tracking helpers ─────────────────────────────────────────

    private fun track(changes: MutableList<AuditChange>, field: String, oldVal: String?, newVal: String?) {
        if (oldVal != newVal)
            changes.add(AuditChange(field, oldVal, newVal))
    }

    private fun trackDate(changes: MutableList<AuditChange>, field: String, oldVal: Instant?, newVal: Instant?) {
        val oldStr = oldVal?.let { dateOnlyFormat.format(it) }
        val newStr = newVal?.let { dateOnlyFormat.format(it) }
        if (oldStr != newStr)
            changes.add(AuditChange(field, oldStr, newStr))
    }

    private fun trackBool(changes: MutableList<AuditChange>, field: String, oldVal: Boolean, newVal: Boolean) {
        if (oldVal != newVal)
            changes.add(AuditChange(field, oldVal.toString(), newVal.toString()))
    }

    private fun trackInt(changes: MutableList<AuditChange>, field: String, oldVal: Int?, newVal: Int?) {
        if (oldVal != newVal)
            changes.add(AuditChange(field, oldVal?.toString(), newVal?.toString()))
    }

    private fun trackDecimal(changes: MutableList<AuditChange>, field: String, oldVal: BigDecimal?, newVal: BigDecimal?) {
        if (oldVal?.compareTo(newVal) != 0 || (oldVal == null) != (newVal == null))
            changes.add(AuditChange(field, oldVal?.let { String.format("%.2f", it) }, newVal?.let { String.format("%.2f", it) }))
    }
}
