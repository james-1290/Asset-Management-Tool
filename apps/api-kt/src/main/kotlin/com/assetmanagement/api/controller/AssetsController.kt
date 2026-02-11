package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.Asset
import com.assetmanagement.api.model.CustomFieldValue
import com.assetmanagement.api.model.enums.AssetStatus
import com.assetmanagement.api.repository.*
import com.assetmanagement.api.service.AuditChange
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
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
@RequestMapping("/api/v1/assets")
class AssetsController(
    private val assetRepository: AssetRepository,
    private val assetTypeRepository: AssetTypeRepository,
    private val locationRepository: LocationRepository,
    private val personRepository: PersonRepository,
    private val assetHistoryRepository: AssetHistoryRepository,
    private val customFieldValueRepository: CustomFieldValueRepository,
    private val customFieldDefinitionRepository: CustomFieldDefinitionRepository,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService
) {
    private val dateFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneOffset.UTC)
    private val dateOnlyFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneOffset.UTC)

    // ──────────────────────────────────────────────────────────────────────────
    // 1. GET / — Paged list with search, status filter, includeStatuses, sorting, typeId
    // ──────────────────────────────────────────────────────────────────────────
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

        // Validate status param if provided
        if (!status.isNullOrBlank()) {
            val parsed = try { AssetStatus.valueOf(status) } catch (_: Exception) { null }
            if (parsed == null) {
                return ResponseEntity.badRequest().body(mapOf("error" to "Invalid status: $status"))
            }
        }

        val spec = buildFilteredSpec(search, status, includeStatuses, typeId)
        val pageReq = PageRequest.of(p - 1, ps, sortOf(sortBy, sortDir))
        val result = assetRepository.findAll(spec, pageReq)
        val assets = result.content

        // Load custom field values for all assets in one query
        val assetIds = assets.map { it.id }
        val allCfvs = if (assetIds.isNotEmpty()) customFieldValueRepository.findByEntityIdIn(assetIds) else emptyList()
        val cfvsByEntity = allCfvs.groupBy { it.entityId }

        val items = assets.map { toDto(it, cfvsByEntity[it.id] ?: emptyList()) }
        return ResponseEntity.ok(PagedResponse(items, p, ps, result.totalElements))
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. GET /export — CSV export with same filters + optional ids param
    // ──────────────────────────────────────────────────────────────────────────
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
        response.setHeader("Content-Disposition", "attachment; filename=assets-export.csv")

        val assets: List<Asset> = if (!ids.isNullOrBlank()) {
            val idList = ids.split(",").mapNotNull { s ->
                try { UUID.fromString(s.trim()) } catch (_: Exception) { null }
            }
            if (idList.isEmpty()) {
                emptyList()
            } else {
                val spec = Specification<Asset> { root, _, cb ->
                    cb.and(
                        cb.equal(root.get<Boolean>("isArchived"), false),
                        root.get<UUID>("id").`in`(idList)
                    )
                }
                assetRepository.findAll(spec, sortOf(sortBy, sortDir))
            }
        } else {
            val spec = buildFilteredSpec(search, status, includeStatuses, typeId)
            assetRepository.findAll(spec, sortOf(sortBy, sortDir))
        }

        val writer = CSVWriter(OutputStreamWriter(response.outputStream))
        writer.writeNext(arrayOf(
            "AssetTag", "Name", "Status", "AssetType", "Location", "AssignedTo",
            "SerialNumber", "PurchaseDate", "PurchaseCost", "WarrantyExpiryDate",
            "Notes", "CreatedAt", "UpdatedAt"
        ))
        assets.forEach { a ->
            writer.writeNext(arrayOf(
                a.assetTag,
                a.name,
                a.status.name,
                a.assetType?.name ?: "",
                a.location?.name ?: "",
                a.assignedPerson?.fullName ?: "",
                a.serialNumber ?: "",
                a.purchaseDate?.let { dateOnlyFormat.format(it) } ?: "",
                a.purchaseCost?.let { String.format("%.2f", it) } ?: "",
                a.warrantyExpiryDate?.let { dateOnlyFormat.format(it) } ?: "",
                a.notes ?: "",
                dateFormat.format(a.createdAt),
                dateFormat.format(a.updatedAt)
            ))
        }
        writer.flush()
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. GET /{id} — Get by ID with custom field values
    // ──────────────────────────────────────────────────────────────────────────
    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<Any> {
        val asset = assetRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        val cfvs = customFieldValueRepository.findByEntityId(asset.id)
        return ResponseEntity.ok(toDto(asset, cfvs))
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. POST / — Create with validation
    // ──────────────────────────────────────────────────────────────────────────
    @PostMapping
    fun create(@RequestBody request: CreateAssetRequest): ResponseEntity<Any> {
        // Validate AssetType exists
        val assetType = assetTypeRepository.findById(request.assetTypeId).orElse(null)
        if (assetType == null || assetType.isArchived)
            return ResponseEntity.badRequest().body(mapOf("error" to "Asset type not found."))

        // Validate Location exists (if provided)
        if (request.locationId != null) {
            val location = locationRepository.findById(request.locationId).orElse(null)
            if (location == null || location.isArchived)
                return ResponseEntity.badRequest().body(mapOf("error" to "Location not found."))
        }

        // Validate AssignedPerson exists (if provided)
        if (request.assignedPersonId != null) {
            val person = personRepository.findById(request.assignedPersonId).orElse(null)
            if (person == null || person.isArchived)
                return ResponseEntity.badRequest().body(mapOf("error" to "Assigned person not found."))
        }

        // Validate AssetTag unique
        if (assetRepository.existsByAssetTag(request.assetTag))
            return ResponseEntity.status(409).body(mapOf("error" to "An asset with this tag already exists."))

        // Parse status
        val status = if (!request.status.isNullOrBlank()) {
            try { AssetStatus.valueOf(request.status) } catch (_: Exception) {
                return ResponseEntity.badRequest().body(mapOf("error" to "Invalid status: ${request.status}"))
            }
        } else {
            AssetStatus.Available
        }

        val asset = Asset(
            name = request.name,
            assetTag = request.assetTag,
            serialNumber = request.serialNumber,
            status = status,
            assetTypeId = request.assetTypeId,
            locationId = request.locationId,
            assignedPersonId = request.assignedPersonId,
            purchaseDate = request.purchaseDate,
            purchaseCost = request.purchaseCost,
            warrantyExpiryDate = request.warrantyExpiryDate,
            notes = request.notes
        )

        assetRepository.save(asset)

        // Create custom field values
        if (!request.customFieldValues.isNullOrEmpty()) {
            val validDefs = customFieldDefinitionRepository.findByAssetTypeIdAndIsArchivedFalse(request.assetTypeId)
            val validDefIds = validDefs.map { it.id }.toSet()

            for (cfv in request.customFieldValues) {
                if (!validDefIds.contains(cfv.fieldDefinitionId))
                    return ResponseEntity.badRequest().body(
                        mapOf("error" to "Custom field definition ${cfv.fieldDefinitionId} not found for this asset type.")
                    )

                customFieldValueRepository.save(
                    CustomFieldValue(
                        customFieldDefinitionId = cfv.fieldDefinitionId,
                        entityId = asset.id,
                        value = cfv.value
                    )
                )
            }
        }

        auditService.log(
            AuditEntry(
                action = "Created",
                entityType = "Asset",
                entityId = asset.id.toString(),
                entityName = asset.name,
                details = "Created asset \"${asset.name}\" (${asset.assetTag})",
                actorId = currentUserService.userId,
                actorName = currentUserService.userName
            )
        )

        // Reload with navigation properties
        val saved = assetRepository.findById(asset.id).orElse(asset)
        val cfvs = customFieldValueRepository.findByEntityId(asset.id)

        return ResponseEntity.created(URI("/api/v1/assets/${saved.id}")).body(toDto(saved, cfvs))
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. PUT /{id} — Update with change tracking, custom field upsert
    // ──────────────────────────────────────────────────────────────────────────
    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody request: UpdateAssetRequest): ResponseEntity<Any> {
        val asset = assetRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        // Validate AssetType exists
        val assetType = assetTypeRepository.findById(request.assetTypeId).orElse(null)
        if (assetType == null || assetType.isArchived)
            return ResponseEntity.badRequest().body(mapOf("error" to "Asset type not found."))

        // Validate Location exists (if provided)
        if (request.locationId != null) {
            val location = locationRepository.findById(request.locationId).orElse(null)
            if (location == null || location.isArchived)
                return ResponseEntity.badRequest().body(mapOf("error" to "Location not found."))
        }

        // Validate AssignedPerson exists (if provided)
        if (request.assignedPersonId != null) {
            val person = personRepository.findById(request.assignedPersonId).orElse(null)
            if (person == null || person.isArchived)
                return ResponseEntity.badRequest().body(mapOf("error" to "Assigned person not found."))
        }

        // Validate AssetTag unique (excluding self)
        val existingByTag = assetRepository.findByAssetTag(request.assetTag)
        if (existingByTag != null && existingByTag.id != id)
            return ResponseEntity.status(409).body(mapOf("error" to "An asset with this tag already exists."))

        // Parse status
        var newStatus: AssetStatus? = null
        if (!request.status.isNullOrBlank()) {
            newStatus = try { AssetStatus.valueOf(request.status) } catch (_: Exception) {
                return ResponseEntity.badRequest().body(mapOf("error" to "Invalid status: ${request.status}"))
            }
        }

        // Detect changes before applying
        val changes = mutableListOf<AuditChange>()

        trackString(changes, "Name", asset.name, request.name)
        trackString(changes, "Asset Tag", asset.assetTag, request.assetTag)
        trackString(changes, "Serial Number", asset.serialNumber, request.serialNumber)
        trackString(changes, "Notes", asset.notes, request.notes)

        if (newStatus != null && newStatus != asset.status)
            changes.add(AuditChange("Status", asset.status.name, newStatus.name))

        if (request.assetTypeId != asset.assetTypeId) {
            val newTypeName = assetTypeRepository.findById(request.assetTypeId).orElse(null)?.name
            changes.add(AuditChange("Type", asset.assetType?.name, newTypeName))
        }

        if (request.locationId != asset.locationId) {
            val oldName = asset.location?.name
            val newName = if (request.locationId != null) locationRepository.findById(request.locationId).orElse(null)?.name else null
            changes.add(AuditChange("Location", oldName, newName))
        }

        var oldAssignedPersonId: UUID? = null
        var oldAssignedPersonName: String? = null
        var newAssignedPersonId: UUID? = null
        var newAssignedPersonName: String? = null

        if (request.assignedPersonId != asset.assignedPersonId) {
            oldAssignedPersonId = asset.assignedPersonId
            oldAssignedPersonName = asset.assignedPerson?.fullName
            newAssignedPersonId = request.assignedPersonId
            if (request.assignedPersonId != null)
                newAssignedPersonName = personRepository.findById(request.assignedPersonId).orElse(null)?.fullName
            changes.add(AuditChange("Assigned To", oldAssignedPersonName, newAssignedPersonName))
        }

        trackDate(changes, "Purchase Date", asset.purchaseDate, request.purchaseDate)
        trackDecimal(changes, "Purchase Cost", asset.purchaseCost, request.purchaseCost)
        trackDate(changes, "Warranty Expiry", asset.warrantyExpiryDate, request.warrantyExpiryDate)

        // Apply changes
        asset.name = request.name
        asset.assetTag = request.assetTag
        asset.serialNumber = request.serialNumber
        asset.assetTypeId = request.assetTypeId
        asset.locationId = request.locationId
        asset.assignedPersonId = request.assignedPersonId
        asset.purchaseDate = request.purchaseDate
        asset.purchaseCost = request.purchaseCost
        asset.warrantyExpiryDate = request.warrantyExpiryDate
        asset.notes = request.notes
        if (newStatus != null) asset.status = newStatus
        asset.updatedAt = Instant.now()

        // Upsert custom field values
        if (request.customFieldValues != null) {
            val existingValues = customFieldValueRepository.findByEntityId(asset.id)
                .associateBy { it.customFieldDefinitionId }

            val validDefs = customFieldDefinitionRepository.findByAssetTypeIdAndIsArchivedFalse(request.assetTypeId)
            val validDefIds = validDefs.map { it.id }.toSet()
            val defNamesById = validDefs.associate { it.id to it.name }

            for (cfv in request.customFieldValues) {
                if (!validDefIds.contains(cfv.fieldDefinitionId))
                    continue

                val existing = existingValues[cfv.fieldDefinitionId]
                if (existing != null) {
                    if (existing.value != cfv.value) {
                        val defName = defNamesById[cfv.fieldDefinitionId] ?: "Unknown"
                        changes.add(AuditChange("Custom: $defName", existing.value, cfv.value))
                        existing.value = cfv.value
                        existing.updatedAt = Instant.now()
                        customFieldValueRepository.save(existing)
                    }
                } else {
                    customFieldValueRepository.save(
                        CustomFieldValue(
                            customFieldDefinitionId = cfv.fieldDefinitionId,
                            entityId = asset.id,
                            value = cfv.value
                        )
                    )
                    val defName = defNamesById[cfv.fieldDefinitionId] ?: "Unknown"
                    if (!cfv.value.isNullOrEmpty())
                        changes.add(AuditChange("Custom: $defName", null, cfv.value))
                }
            }
        }

        assetRepository.save(asset)

        auditService.log(
            AuditEntry(
                action = "Updated",
                entityType = "Asset",
                entityId = asset.id.toString(),
                entityName = asset.name,
                details = "Updated asset \"${asset.name}\" (${asset.assetTag})",
                actorId = currentUserService.userId,
                actorName = currentUserService.userName,
                changes = if (changes.isNotEmpty()) changes else null
            )
        )

        // Log assignment changes to person history
        if (oldAssignedPersonId != null && oldAssignedPersonId != newAssignedPersonId) {
            auditService.log(
                AuditEntry(
                    action = "AssetUnassigned",
                    entityType = "Person",
                    entityId = oldAssignedPersonId.toString(),
                    entityName = oldAssignedPersonName,
                    details = "Asset \"${asset.name}\" (${asset.assetTag}) unassigned from this person",
                    actorId = currentUserService.userId,
                    actorName = currentUserService.userName
                )
            )
        }
        if (newAssignedPersonId != null && newAssignedPersonId != oldAssignedPersonId) {
            auditService.log(
                AuditEntry(
                    action = "AssetAssigned",
                    entityType = "Person",
                    entityId = newAssignedPersonId.toString(),
                    entityName = newAssignedPersonName,
                    details = "Asset \"${asset.name}\" (${asset.assetTag}) assigned to this person",
                    actorId = currentUserService.userId,
                    actorName = currentUserService.userName
                )
            )
        }

        // Reload with navigation properties
        val saved = assetRepository.findById(asset.id).orElse(asset)
        val cfvs = customFieldValueRepository.findByEntityId(asset.id)

        return ResponseEntity.ok(toDto(saved, cfvs))
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. GET /{id}/history — History timeline with changes
    // ──────────────────────────────────────────────────────────────────────────
    @GetMapping("/{id}/history")
    fun getHistory(
        @PathVariable id: UUID,
        @RequestParam(required = false) limit: Int?
    ): ResponseEntity<Any> {
        if (!assetRepository.existsById(id))
            return ResponseEntity.notFound().build()

        val historyEntries = if (limit != null && limit > 0) {
            assetHistoryRepository.findByAssetIdOrderByTimestampDesc(id, PageRequest.of(0, limit))
        } else {
            assetHistoryRepository.findByAssetIdOrderByTimestampDesc(id)
        }

        val dtos = historyEntries.map { h ->
            AssetHistoryDto(
                id = h.id,
                eventType = h.eventType.name,
                details = h.details,
                timestamp = h.timestamp,
                performedByUserName = h.performedByUser?.displayName,
                changes = h.changes.map { c ->
                    AssetHistoryChangeDto(c.fieldName, c.oldValue, c.newValue)
                }
            )
        }

        return ResponseEntity.ok(dtos)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. POST /{id}/checkout — Checkout to person
    // ──────────────────────────────────────────────────────────────────────────
    @PostMapping("/{id}/checkout")
    fun checkout(@PathVariable id: UUID, @RequestBody request: CheckoutAssetRequest): ResponseEntity<Any> {
        val asset = assetRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        if (asset.isArchived)
            return ResponseEntity.badRequest().body(mapOf("error" to "Cannot check out an archived asset."))

        if (asset.status != AssetStatus.Available && asset.status != AssetStatus.Assigned)
            return ResponseEntity.badRequest().body(
                mapOf("error" to "Asset must be Available or Assigned to check out. Current status: ${asset.status}")
            )

        val person = personRepository.findById(request.personId).orElse(null)
        if (person == null || person.isArchived)
            return ResponseEntity.badRequest().body(mapOf("error" to "Person not found."))

        val changes = mutableListOf<AuditChange>()
        changes.add(AuditChange("Status", asset.status.name, AssetStatus.CheckedOut.name))

        val oldPersonName = asset.assignedPerson?.fullName
        if (asset.assignedPersonId != request.personId)
            changes.add(AuditChange("Assigned To", oldPersonName, person.fullName))

        asset.status = AssetStatus.CheckedOut
        asset.assignedPersonId = request.personId
        asset.updatedAt = Instant.now()
        assetRepository.save(asset)

        val details = "Checked out \"${asset.name}\" to ${person.fullName}" +
            if (request.notes != null) " — ${request.notes}" else ""

        auditService.log(
            AuditEntry(
                action = "CheckedOut",
                entityType = "Asset",
                entityId = asset.id.toString(),
                entityName = asset.name,
                details = details,
                actorId = currentUserService.userId,
                actorName = currentUserService.userName,
                changes = changes
            )
        )

        // Log to person history
        auditService.log(
            AuditEntry(
                action = "AssetCheckedOut",
                entityType = "Person",
                entityId = person.id.toString(),
                entityName = person.fullName,
                details = "Asset \"${asset.name}\" (${asset.assetTag}) checked out to this person",
                actorId = currentUserService.userId,
                actorName = currentUserService.userName
            )
        )

        // Reload
        val saved = assetRepository.findById(asset.id).orElse(asset)
        val cfvs = customFieldValueRepository.findByEntityId(asset.id)
        return ResponseEntity.ok(toDto(saved, cfvs))
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 8. POST /{id}/checkin — Checkin from person
    // ──────────────────────────────────────────────────────────────────────────
    @PostMapping("/{id}/checkin")
    fun checkin(@PathVariable id: UUID, @RequestBody request: CheckinAssetRequest): ResponseEntity<Any> {
        val asset = assetRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        if (asset.isArchived)
            return ResponseEntity.badRequest().body(mapOf("error" to "Cannot check in an archived asset."))

        if (asset.status != AssetStatus.CheckedOut)
            return ResponseEntity.badRequest().body(
                mapOf("error" to "Asset must be CheckedOut to check in. Current status: ${asset.status}")
            )

        val changes = mutableListOf<AuditChange>()
        changes.add(AuditChange("Status", asset.status.name, AssetStatus.Available.name))

        val oldPersonId = asset.assignedPersonId
        val oldPersonName = asset.assignedPerson?.fullName
        if (oldPersonName != null)
            changes.add(AuditChange("Assigned To", oldPersonName, null))

        var detailParts = "Checked in \"${asset.name}\""
        if (oldPersonName != null)
            detailParts += " from $oldPersonName"
        if (request.notes != null)
            detailParts += " — ${request.notes}"

        asset.status = AssetStatus.Available
        asset.assignedPersonId = null
        asset.updatedAt = Instant.now()
        assetRepository.save(asset)

        auditService.log(
            AuditEntry(
                action = "CheckedIn",
                entityType = "Asset",
                entityId = asset.id.toString(),
                entityName = asset.name,
                details = detailParts,
                actorId = currentUserService.userId,
                actorName = currentUserService.userName,
                changes = changes
            )
        )

        // Log to person history
        if (oldPersonId != null) {
            auditService.log(
                AuditEntry(
                    action = "AssetCheckedIn",
                    entityType = "Person",
                    entityId = oldPersonId.toString(),
                    entityName = oldPersonName,
                    details = "Asset \"${asset.name}\" (${asset.assetTag}) checked in from this person",
                    actorId = currentUserService.userId,
                    actorName = currentUserService.userName
                )
            )
        }

        // Reload
        val saved = assetRepository.findById(asset.id).orElse(asset)
        val cfvs = customFieldValueRepository.findByEntityId(asset.id)
        return ResponseEntity.ok(toDto(saved, cfvs))
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 9. POST /{id}/retire — Retire asset
    // ──────────────────────────────────────────────────────────────────────────
    @PostMapping("/{id}/retire")
    fun retire(@PathVariable id: UUID, @RequestBody request: RetireAssetRequest): ResponseEntity<Any> {
        val asset = assetRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        if (asset.isArchived)
            return ResponseEntity.badRequest().body(mapOf("error" to "Cannot retire an archived asset."))
        if (asset.status == AssetStatus.Retired)
            return ResponseEntity.badRequest().body(mapOf("error" to "Asset is already retired."))
        if (asset.status == AssetStatus.Sold)
            return ResponseEntity.badRequest().body(mapOf("error" to "Cannot retire a sold asset."))

        val changes = mutableListOf<AuditChange>()
        changes.add(AuditChange("Status", asset.status.name, AssetStatus.Retired.name))

        val oldPersonId = asset.assignedPersonId
        val oldPersonName = asset.assignedPerson?.fullName
        if (oldPersonName != null)
            changes.add(AuditChange("Assigned To", oldPersonName, null))

        val now = Instant.now()
        changes.add(AuditChange("Retired Date", null, dateOnlyFormat.format(now)))

        asset.status = AssetStatus.Retired
        asset.retiredDate = now
        asset.assignedPersonId = null
        asset.updatedAt = now
        assetRepository.save(asset)

        var details = "Retired asset \"${asset.name}\" (${asset.assetTag})"
        if (request.notes != null) details += " — ${request.notes}"

        auditService.log(
            AuditEntry(
                action = "Retired",
                entityType = "Asset",
                entityId = asset.id.toString(),
                entityName = asset.name,
                details = details,
                actorId = currentUserService.userId,
                actorName = currentUserService.userName,
                changes = changes
            )
        )

        // Log to person history
        if (oldPersonId != null) {
            auditService.log(
                AuditEntry(
                    action = "AssetUnassigned",
                    entityType = "Person",
                    entityId = oldPersonId.toString(),
                    entityName = oldPersonName,
                    details = "Asset \"${asset.name}\" (${asset.assetTag}) unassigned (asset retired)",
                    actorId = currentUserService.userId,
                    actorName = currentUserService.userName
                )
            )
        }

        // Reload
        val saved = assetRepository.findById(asset.id).orElse(asset)
        val cfvs = customFieldValueRepository.findByEntityId(asset.id)
        return ResponseEntity.ok(toDto(saved, cfvs))
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 10. POST /{id}/sell — Sell asset
    // ──────────────────────────────────────────────────────────────────────────
    @PostMapping("/{id}/sell")
    fun sell(@PathVariable id: UUID, @RequestBody request: SellAssetRequest): ResponseEntity<Any> {
        val asset = assetRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        if (asset.isArchived)
            return ResponseEntity.badRequest().body(mapOf("error" to "Cannot sell an archived asset."))
        if (asset.status == AssetStatus.Sold)
            return ResponseEntity.badRequest().body(mapOf("error" to "Asset is already sold."))
        if (asset.status == AssetStatus.Retired)
            return ResponseEntity.badRequest().body(mapOf("error" to "Cannot sell a retired asset."))

        val changes = mutableListOf<AuditChange>()
        changes.add(AuditChange("Status", asset.status.name, AssetStatus.Sold.name))

        val oldPersonId = asset.assignedPersonId
        val oldPersonName = asset.assignedPerson?.fullName
        if (oldPersonName != null)
            changes.add(AuditChange("Assigned To", oldPersonName, null))

        val soldDate = request.soldDate ?: Instant.now()
        changes.add(AuditChange("Sold Date", null, dateOnlyFormat.format(soldDate)))

        if (request.soldPrice != null)
            changes.add(AuditChange("Sold Price", null, String.format("%.2f", request.soldPrice)))

        asset.status = AssetStatus.Sold
        asset.soldDate = soldDate
        asset.soldPrice = request.soldPrice
        asset.assignedPersonId = null
        asset.updatedAt = Instant.now()
        assetRepository.save(asset)

        var details = "Sold asset \"${asset.name}\" (${asset.assetTag})"
        if (request.soldPrice != null)
            details += " for ${String.format("%.2f", request.soldPrice)}"
        if (request.notes != null)
            details += " — ${request.notes}"

        auditService.log(
            AuditEntry(
                action = "Sold",
                entityType = "Asset",
                entityId = asset.id.toString(),
                entityName = asset.name,
                details = details,
                actorId = currentUserService.userId,
                actorName = currentUserService.userName,
                changes = changes
            )
        )

        // Log to person history
        if (oldPersonId != null) {
            auditService.log(
                AuditEntry(
                    action = "AssetUnassigned",
                    entityType = "Person",
                    entityId = oldPersonId.toString(),
                    entityName = oldPersonName,
                    details = "Asset \"${asset.name}\" (${asset.assetTag}) unassigned (asset sold)",
                    actorId = currentUserService.userId,
                    actorName = currentUserService.userName
                )
            )
        }

        // Reload
        val saved = assetRepository.findById(asset.id).orElse(asset)
        val cfvs = customFieldValueRepository.findByEntityId(asset.id)
        return ResponseEntity.ok(toDto(saved, cfvs))
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 11. POST /bulk-archive — Bulk archive
    // ──────────────────────────────────────────────────────────────────────────
    @PostMapping("/bulk-archive")
    fun bulkArchive(@RequestBody request: BulkArchiveRequest): ResponseEntity<BulkActionResponse> {
        var succeeded = 0
        var failed = 0

        for (id in request.ids) {
            val asset = assetRepository.findById(id).orElse(null)
            if (asset == null || asset.isArchived) {
                failed++
                continue
            }

            asset.isArchived = true
            asset.updatedAt = Instant.now()
            assetRepository.save(asset)

            auditService.log(
                AuditEntry(
                    action = "Archived",
                    entityType = "Asset",
                    entityId = asset.id.toString(),
                    entityName = asset.name,
                    details = "Bulk archived asset \"${asset.name}\" (${asset.assetTag})",
                    actorId = currentUserService.userId,
                    actorName = currentUserService.userName
                )
            )
            succeeded++
        }

        return ResponseEntity.ok(BulkActionResponse(succeeded, failed))
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 12. POST /bulk-status — Bulk status change
    // ──────────────────────────────────────────────────────────────────────────
    @PostMapping("/bulk-status")
    fun bulkStatus(@RequestBody request: BulkStatusRequest): ResponseEntity<Any> {
        val newStatus = try { AssetStatus.valueOf(request.status) } catch (_: Exception) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Invalid status: ${request.status}"))
        }

        var succeeded = 0
        var failed = 0

        for (id in request.ids) {
            val asset = assetRepository.findById(id).orElse(null)
            if (asset == null || asset.isArchived) {
                failed++
                continue
            }

            val oldStatus = asset.status
            asset.status = newStatus
            asset.updatedAt = Instant.now()
            assetRepository.save(asset)

            auditService.log(
                AuditEntry(
                    action = "StatusChanged",
                    entityType = "Asset",
                    entityId = asset.id.toString(),
                    entityName = asset.name,
                    details = "Bulk status change \"${asset.name}\" (${asset.assetTag}): $oldStatus → $newStatus",
                    actorId = currentUserService.userId,
                    actorName = currentUserService.userName,
                    changes = listOf(AuditChange("Status", oldStatus.name, newStatus.name))
                )
            )
            succeeded++
        }

        return ResponseEntity.ok(BulkActionResponse(succeeded, failed))
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 13. DELETE /{id} — Archive (soft delete)
    // ──────────────────────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    fun archive(@PathVariable id: UUID): ResponseEntity<Any> {
        val asset = assetRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        asset.isArchived = true
        asset.updatedAt = Instant.now()
        assetRepository.save(asset)

        auditService.log(
            AuditEntry(
                action = "Archived",
                entityType = "Asset",
                entityId = asset.id.toString(),
                entityName = asset.name,
                details = "Archived asset \"${asset.name}\" (${asset.assetTag})",
                actorId = currentUserService.userId,
                actorName = currentUserService.userName
            )
        )

        return ResponseEntity.noContent().build()
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────────────────────

    private fun buildFilteredSpec(
        search: String?,
        status: String?,
        includeStatuses: String?,
        typeId: UUID?
    ): Specification<Asset> = Specification { root, _, cb ->
        val predicates = mutableListOf<Predicate>()

        // Always exclude archived
        predicates.add(cb.equal(root.get<Boolean>("isArchived"), false))

        // Type filter
        if (typeId != null)
            predicates.add(cb.equal(root.get<UUID>("assetTypeId"), typeId))

        // Search across name and asset tag
        if (!search.isNullOrBlank()) {
            val pattern = "%${search.lowercase()}%"
            predicates.add(
                cb.or(
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(root.get("assetTag")), pattern)
                )
            )
        }

        // Status filtering
        if (!status.isNullOrBlank()) {
            val parsedStatus = try { AssetStatus.valueOf(status) } catch (_: Exception) { null }
            if (parsedStatus != null)
                predicates.add(cb.equal(root.get<AssetStatus>("status"), parsedStatus))
        } else {
            // By default, hide Retired and Sold unless explicitly included
            val hiddenStatuses = mutableSetOf(AssetStatus.Retired, AssetStatus.Sold)
            if (!includeStatuses.isNullOrBlank()) {
                for (s in includeStatuses.split(",").map { it.trim() }) {
                    val parsed = try { AssetStatus.valueOf(s) } catch (_: Exception) { null }
                    if (parsed != null) hiddenStatuses.remove(parsed)
                }
            }
            if (hiddenStatuses.isNotEmpty()) {
                predicates.add(cb.not(root.get<AssetStatus>("status").`in`(hiddenStatuses)))
            }
        }

        cb.and(*predicates.toTypedArray())
    }

    private fun sortOf(sortBy: String, sortDir: String): Sort {
        val dir = if (sortDir.equals("desc", ignoreCase = true)) Sort.Direction.DESC else Sort.Direction.ASC
        val prop = when (sortBy.lowercase()) {
            "assettag" -> "assetTag"
            "status" -> "status"
            "assettypename" -> "assetType.name"
            "locationname" -> "location.name"
            "purchasedate" -> "purchaseDate"
            "purchasecost" -> "purchaseCost"
            "warrantyexpirydate" -> "warrantyExpiryDate"
            "createdat" -> "createdAt"
            else -> "name"
        }
        return Sort.by(dir, prop)
    }

    private fun toDto(asset: Asset, cfvs: List<CustomFieldValue>): AssetDto {
        val cfvDtos = cfvs
            .filter { it.customFieldDefinition?.isArchived != true }
            .map { v ->
                CustomFieldValueDto(
                    fieldDefinitionId = v.customFieldDefinitionId,
                    fieldName = v.customFieldDefinition?.name ?: "",
                    fieldType = v.customFieldDefinition?.fieldType?.name ?: "",
                    value = v.value
                )
            }

        return AssetDto(
            id = asset.id,
            name = asset.name,
            assetTag = asset.assetTag,
            serialNumber = asset.serialNumber,
            status = asset.status.name,
            assetTypeId = asset.assetTypeId,
            assetTypeName = asset.assetType?.name ?: "",
            locationId = asset.locationId,
            locationName = asset.location?.name,
            assignedPersonId = asset.assignedPersonId,
            assignedPersonName = asset.assignedPerson?.fullName,
            purchaseDate = asset.purchaseDate,
            purchaseCost = asset.purchaseCost,
            warrantyExpiryDate = asset.warrantyExpiryDate,
            depreciationMonths = asset.depreciationMonths,
            soldDate = asset.soldDate,
            soldPrice = asset.soldPrice,
            retiredDate = asset.retiredDate,
            notes = asset.notes,
            isArchived = asset.isArchived,
            createdAt = asset.createdAt,
            updatedAt = asset.updatedAt,
            customFieldValues = cfvDtos
        )
    }

    private fun trackString(changes: MutableList<AuditChange>, field: String, oldVal: String?, newVal: String?) {
        if (oldVal != newVal)
            changes.add(AuditChange(field, oldVal, newVal))
    }

    private fun trackDate(changes: MutableList<AuditChange>, field: String, oldVal: Instant?, newVal: Instant?) {
        val oldStr = oldVal?.let { dateOnlyFormat.format(it) }
        val newStr = newVal?.let { dateOnlyFormat.format(it) }
        if (oldStr != newStr)
            changes.add(AuditChange(field, oldStr, newStr))
    }

    private fun trackDecimal(changes: MutableList<AuditChange>, field: String, oldVal: BigDecimal?, newVal: BigDecimal?) {
        if (oldVal?.compareTo(newVal) != 0 || (oldVal == null) != (newVal == null))
            changes.add(AuditChange(field, oldVal?.let { String.format("%.2f", it) }, newVal?.let { String.format("%.2f", it) }))
    }
}
