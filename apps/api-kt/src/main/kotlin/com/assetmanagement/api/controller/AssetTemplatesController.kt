package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.AssetTemplate
import com.assetmanagement.api.model.CustomFieldValue
import com.assetmanagement.api.repository.*
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.net.URI
import java.time.Instant
import java.util.*

@RestController
@RequestMapping("/api/v1/asset-templates")
class AssetTemplatesController(
    private val assetTemplateRepository: AssetTemplateRepository,
    private val assetTypeRepository: AssetTypeRepository,
    private val locationRepository: LocationRepository,
    private val customFieldValueRepository: CustomFieldValueRepository,
    private val customFieldDefinitionRepository: CustomFieldDefinitionRepository,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService
) {

    // GET / — List all (optionally filter by assetTypeId)
    @GetMapping
    fun getAll(@RequestParam(required = false) assetTypeId: UUID?): ResponseEntity<List<AssetTemplateDto>> {
        val templates = if (assetTypeId != null) {
            assetTemplateRepository.findByAssetTypeIdAndIsArchivedFalse(assetTypeId)
        } else {
            assetTemplateRepository.findByIsArchivedFalse()
        }

        val templateIds = templates.map { it.id }
        val allCfvs = if (templateIds.isNotEmpty()) customFieldValueRepository.findByEntityIdIn(templateIds) else emptyList()
        val cfvsByEntity = allCfvs.groupBy { it.entityId }

        val dtos = templates.map { toDto(it, cfvsByEntity[it.id] ?: emptyList()) }
        return ResponseEntity.ok(dtos)
    }

    // GET /{id} — Get by ID with custom field values
    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<Any> {
        val template = assetTemplateRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        val cfvs = customFieldValueRepository.findByEntityId(template.id)
        return ResponseEntity.ok(toDto(template, cfvs))
    }

    // POST / — Create
    @PostMapping
    fun create(@RequestBody request: CreateAssetTemplateRequest): ResponseEntity<Any> {
        if (request.name.isBlank())
            return ResponseEntity.badRequest().body(mapOf("error" to "Name is required."))

        val assetType = assetTypeRepository.findById(request.assetTypeId).orElse(null)
        if (assetType == null || assetType.isArchived)
            return ResponseEntity.badRequest().body(mapOf("error" to "Asset type not found."))

        if (request.locationId != null) {
            val location = locationRepository.findById(request.locationId).orElse(null)
            if (location == null || location.isArchived)
                return ResponseEntity.badRequest().body(mapOf("error" to "Location not found."))
        }

        val template = AssetTemplate(
            assetTypeId = request.assetTypeId,
            name = request.name,
            purchaseCost = request.purchaseCost,
            depreciationMonths = request.depreciationMonths,
            locationId = request.locationId,
            notes = request.notes
        )

        assetTemplateRepository.save(template)

        // Save custom field values
        if (!request.customFieldValues.isNullOrEmpty()) {
            val validDefs = customFieldDefinitionRepository.findByAssetTypeIdAndIsArchivedFalse(request.assetTypeId)
            val validDefIds = validDefs.map { it.id }.toSet()

            for (cfv in request.customFieldValues) {
                if (!validDefIds.contains(cfv.fieldDefinitionId)) continue

                customFieldValueRepository.save(
                    CustomFieldValue(
                        customFieldDefinitionId = cfv.fieldDefinitionId,
                        entityId = template.id,
                        value = cfv.value
                    )
                )
            }
        }

        auditService.log(
            AuditEntry(
                action = "Created",
                entityType = "AssetTemplate",
                entityId = template.id.toString(),
                entityName = template.name,
                details = "Created asset template \"${template.name}\"",
                actorId = currentUserService.userId,
                actorName = currentUserService.userName
            )
        )

        val saved = assetTemplateRepository.findById(template.id).orElse(template)
        val cfvs = customFieldValueRepository.findByEntityId(template.id)

        return ResponseEntity.created(URI("/api/v1/asset-templates/${saved.id}")).body(toDto(saved, cfvs))
    }

    // PUT /{id} — Update
    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody request: UpdateAssetTemplateRequest): ResponseEntity<Any> {
        val template = assetTemplateRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        if (request.name.isBlank())
            return ResponseEntity.badRequest().body(mapOf("error" to "Name is required."))

        if (request.locationId != null) {
            val location = locationRepository.findById(request.locationId).orElse(null)
            if (location == null || location.isArchived)
                return ResponseEntity.badRequest().body(mapOf("error" to "Location not found."))
        }

        template.name = request.name
        template.purchaseCost = request.purchaseCost
        template.depreciationMonths = request.depreciationMonths
        template.locationId = request.locationId
        template.notes = request.notes
        template.updatedAt = Instant.now()

        // Upsert custom field values
        if (request.customFieldValues != null) {
            val existingValues = customFieldValueRepository.findByEntityId(template.id)
                .associateBy { it.customFieldDefinitionId }

            val validDefs = customFieldDefinitionRepository.findByAssetTypeIdAndIsArchivedFalse(template.assetTypeId)
            val validDefIds = validDefs.map { it.id }.toSet()

            for (cfv in request.customFieldValues) {
                if (!validDefIds.contains(cfv.fieldDefinitionId)) continue

                val existing = existingValues[cfv.fieldDefinitionId]
                if (existing != null) {
                    existing.value = cfv.value
                    existing.updatedAt = Instant.now()
                    customFieldValueRepository.save(existing)
                } else {
                    customFieldValueRepository.save(
                        CustomFieldValue(
                            customFieldDefinitionId = cfv.fieldDefinitionId,
                            entityId = template.id,
                            value = cfv.value
                        )
                    )
                }
            }
        }

        assetTemplateRepository.save(template)

        auditService.log(
            AuditEntry(
                action = "Updated",
                entityType = "AssetTemplate",
                entityId = template.id.toString(),
                entityName = template.name,
                details = "Updated asset template \"${template.name}\"",
                actorId = currentUserService.userId,
                actorName = currentUserService.userName
            )
        )

        val saved = assetTemplateRepository.findById(template.id).orElse(template)
        val cfvs = customFieldValueRepository.findByEntityId(template.id)

        return ResponseEntity.ok(toDto(saved, cfvs))
    }

    // DELETE /{id} — Archive (soft delete)
    @DeleteMapping("/{id}")
    fun archive(@PathVariable id: UUID): ResponseEntity<Any> {
        val template = assetTemplateRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        template.isArchived = true
        template.updatedAt = Instant.now()
        assetTemplateRepository.save(template)

        auditService.log(
            AuditEntry(
                action = "Archived",
                entityType = "AssetTemplate",
                entityId = template.id.toString(),
                entityName = template.name,
                details = "Archived asset template \"${template.name}\"",
                actorId = currentUserService.userId,
                actorName = currentUserService.userName
            )
        )

        return ResponseEntity.noContent().build()
    }

    private fun toDto(template: AssetTemplate, cfvs: List<CustomFieldValue>): AssetTemplateDto {
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

        return AssetTemplateDto(
            id = template.id,
            assetTypeId = template.assetTypeId,
            assetTypeName = template.assetType?.name ?: "",
            name = template.name,
            purchaseCost = template.purchaseCost,
            depreciationMonths = template.depreciationMonths,
            locationId = template.locationId,
            locationName = template.location?.name,
            notes = template.notes,
            isArchived = template.isArchived,
            createdAt = template.createdAt,
            updatedAt = template.updatedAt,
            customFieldValues = cfvDtos
        )
    }
}
