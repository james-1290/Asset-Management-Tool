package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.AssetType
import com.assetmanagement.api.model.CustomFieldDefinition
import com.assetmanagement.api.model.enums.CustomFieldType
import com.assetmanagement.api.model.enums.EntityType
import com.assetmanagement.api.repository.AssetTypeRepository
import com.assetmanagement.api.repository.CustomFieldDefinitionRepository
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
import jakarta.persistence.criteria.Predicate
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.net.URI
import java.time.Instant
import java.util.*

@RestController
@RequestMapping("/api/v1/assettypes")
class AssetTypesController(
    private val assetTypeRepository: AssetTypeRepository,
    private val customFieldDefinitionRepository: CustomFieldDefinitionRepository,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService
) {

    @GetMapping
    fun getAll(
        @RequestParam(defaultValue = "1") page: Int, @RequestParam(defaultValue = "25") pageSize: Int,
        @RequestParam(required = false) search: String?, @RequestParam(defaultValue = "name") sortBy: String,
        @RequestParam(defaultValue = "asc") sortDir: String
    ): ResponseEntity<PagedResponse<AssetTypeDto>> {
        val p = maxOf(1, page); val ps = pageSize.coerceIn(1, 100)
        val spec = Specification<AssetType> { root, _, cb ->
            val preds = mutableListOf<Predicate>()
            preds.add(cb.equal(root.get<Boolean>("isArchived"), false))
            if (!search.isNullOrBlank()) preds.add(cb.like(cb.lower(root.get("name")), "%${search.lowercase()}%"))
            cb.and(*preds.toTypedArray())
        }
        val dir = if (sortDir.equals("desc", ignoreCase = true)) Sort.Direction.DESC else Sort.Direction.ASC
        val sort = Sort.by(dir, when (sortBy.lowercase()) { "createdat" -> "createdAt"; "description" -> "description"; else -> "name" })
        val result = assetTypeRepository.findAll(spec, PageRequest.of(p - 1, ps, sort))
        val items = result.content.map { it.toDto() }
        return ResponseEntity.ok(PagedResponse(items, p, ps, result.totalElements))
    }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<AssetTypeDto> {
        val type = assetTypeRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(type.toDto())
    }

    @GetMapping("/{id}/customfields")
    fun getCustomFields(@PathVariable id: UUID): ResponseEntity<Any> {
        if (!assetTypeRepository.existsById(id)) return ResponseEntity.notFound().build()
        val defs = customFieldDefinitionRepository.findByAssetTypeIdAndIsArchivedFalse(id)
            .sortedBy { it.sortOrder }
            .map { CustomFieldDefinitionDto(it.id, it.name, it.fieldType.name, it.options, it.isRequired, it.sortOrder) }
        return ResponseEntity.ok(defs)
    }

    @PostMapping
    fun create(@RequestBody request: CreateAssetTypeRequest): ResponseEntity<Any> {
        val type = AssetType(name = request.name, description = request.description, defaultDepreciationMonths = request.defaultDepreciationMonths)
        assetTypeRepository.save(type)

        request.customFields?.forEach { field ->
            val fieldType = runCatching { CustomFieldType.valueOf(field.fieldType) }.getOrNull()
                ?: return ResponseEntity.badRequest().body(mapOf("error" to "Invalid field type: ${field.fieldType}"))
            customFieldDefinitionRepository.save(CustomFieldDefinition(
                entityType = EntityType.Asset, assetTypeId = type.id, name = field.name,
                fieldType = fieldType, options = field.options, isRequired = field.isRequired, sortOrder = field.sortOrder
            ))
        }

        auditService.log(AuditEntry("Created", "AssetType", type.id.toString(), type.name,
            "Created asset type \"${type.name}\"", currentUserService.userId, currentUserService.userName))

        return ResponseEntity.created(URI("/api/v1/assettypes/${type.id}"))
            .body(assetTypeRepository.findById(type.id).get().toDto())
    }

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody request: UpdateAssetTypeRequest): ResponseEntity<Any> {
        val type = assetTypeRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        type.name = request.name; type.description = request.description; type.defaultDepreciationMonths = request.defaultDepreciationMonths; type.updatedAt = Instant.now()

        if (request.customFields != null) {
            val existing = type.customFieldDefinitions.filter { !it.isArchived }
            val requestIds = request.customFields.mapNotNull { it.id }.toSet()
            existing.forEach { if (it.id !in requestIds) it.isArchived = true }
            request.customFields.forEach { field ->
                val fieldType = runCatching { CustomFieldType.valueOf(field.fieldType) }.getOrNull()
                    ?: return ResponseEntity.badRequest().body(mapOf("error" to "Invalid field type: ${field.fieldType}"))
                if (field.id != null) {
                    existing.find { it.id == field.id }?.apply {
                        name = field.name; this.fieldType = fieldType; options = field.options
                        isRequired = field.isRequired; sortOrder = field.sortOrder
                    }
                } else {
                    type.customFieldDefinitions.add(CustomFieldDefinition(
                        entityType = EntityType.Asset, assetTypeId = type.id, name = field.name,
                        fieldType = fieldType, options = field.options, isRequired = field.isRequired, sortOrder = field.sortOrder
                    ))
                }
            }
        }
        assetTypeRepository.save(type)

        auditService.log(AuditEntry("Updated", "AssetType", type.id.toString(), type.name,
            "Updated asset type \"${type.name}\"", currentUserService.userId, currentUserService.userName))

        return ResponseEntity.ok(assetTypeRepository.findById(type.id).get().toDto())
    }

    @PostMapping("/bulk-archive")
    fun bulkArchive(@RequestBody request: BulkArchiveRequest): ResponseEntity<BulkActionResponse> {
        var succeeded = 0; var failed = 0
        request.ids.forEach { id ->
            val type = assetTypeRepository.findById(id).orElse(null)
            if (type == null || type.isArchived) { failed++; return@forEach }
            type.isArchived = true; type.updatedAt = Instant.now(); assetTypeRepository.save(type)
            auditService.log(AuditEntry("Archived", "AssetType", type.id.toString(), type.name,
                "Bulk archived asset type \"${type.name}\"", currentUserService.userId, currentUserService.userName))
            succeeded++
        }
        return ResponseEntity.ok(BulkActionResponse(succeeded, failed))
    }

    @DeleteMapping("/{id}")
    fun archive(@PathVariable id: UUID): ResponseEntity<Any> {
        val type = assetTypeRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        type.isArchived = true; type.updatedAt = Instant.now(); assetTypeRepository.save(type)
        auditService.log(AuditEntry("Archived", "AssetType", type.id.toString(), type.name,
            "Archived asset type \"${type.name}\"", currentUserService.userId, currentUserService.userName))
        return ResponseEntity.noContent().build()
    }

    private fun AssetType.toDto() = AssetTypeDto(id, name, description, defaultDepreciationMonths, isArchived, createdAt, updatedAt,
        customFieldDefinitions.filter { !it.isArchived }.sortedBy { it.sortOrder }
            .map { CustomFieldDefinitionDto(it.id, it.name, it.fieldType.name, it.options, it.isRequired, it.sortOrder) })
}
