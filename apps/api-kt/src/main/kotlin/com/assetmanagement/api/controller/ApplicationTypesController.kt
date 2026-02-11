package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.ApplicationType
import com.assetmanagement.api.model.CustomFieldDefinition
import com.assetmanagement.api.model.enums.CustomFieldType
import com.assetmanagement.api.model.enums.EntityType
import com.assetmanagement.api.repository.ApplicationTypeRepository
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
@RequestMapping("/api/v1/applicationtypes")
class ApplicationTypesController(
    private val applicationTypeRepository: ApplicationTypeRepository,
    private val customFieldDefinitionRepository: CustomFieldDefinitionRepository,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService
) {

    @GetMapping
    fun getAll(
        @RequestParam(defaultValue = "1") page: Int, @RequestParam(defaultValue = "25") pageSize: Int,
        @RequestParam(required = false) search: String?, @RequestParam(defaultValue = "name") sortBy: String,
        @RequestParam(defaultValue = "asc") sortDir: String
    ): ResponseEntity<PagedResponse<ApplicationTypeDto>> {
        val p = maxOf(1, page); val ps = pageSize.coerceIn(1, 100)
        val spec = Specification<ApplicationType> { root, _, cb ->
            val preds = mutableListOf<Predicate>()
            preds.add(cb.equal(root.get<Boolean>("isArchived"), false))
            if (!search.isNullOrBlank()) preds.add(cb.like(cb.lower(root.get("name")), "%${search.lowercase()}%"))
            cb.and(*preds.toTypedArray())
        }
        val dir = if (sortDir.equals("desc", ignoreCase = true)) Sort.Direction.DESC else Sort.Direction.ASC
        val sort = Sort.by(dir, when (sortBy.lowercase()) { "createdat" -> "createdAt"; "description" -> "description"; else -> "name" })
        val result = applicationTypeRepository.findAll(spec, PageRequest.of(p - 1, ps, sort))
        return ResponseEntity.ok(PagedResponse(result.content.map { it.toDto() }, p, ps, result.totalElements))
    }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<ApplicationTypeDto> {
        val type = applicationTypeRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(type.toDto())
    }

    @GetMapping("/{id}/customfields")
    fun getCustomFields(@PathVariable id: UUID): ResponseEntity<Any> {
        if (!applicationTypeRepository.existsById(id)) return ResponseEntity.notFound().build()
        val defs = customFieldDefinitionRepository.findByApplicationTypeIdAndIsArchivedFalse(id)
            .sortedBy { it.sortOrder }.map { CustomFieldDefinitionDto(it.id, it.name, it.fieldType.name, it.options, it.isRequired, it.sortOrder) }
        return ResponseEntity.ok(defs)
    }

    @PostMapping
    fun create(@RequestBody request: CreateApplicationTypeRequest): ResponseEntity<Any> {
        val type = ApplicationType(name = request.name, description = request.description)
        applicationTypeRepository.save(type)
        request.customFields?.forEach { field ->
            val ft = runCatching { CustomFieldType.valueOf(field.fieldType) }.getOrNull()
                ?: return ResponseEntity.badRequest().body(mapOf("error" to "Invalid field type: ${field.fieldType}"))
            customFieldDefinitionRepository.save(CustomFieldDefinition(entityType = EntityType.Application, applicationTypeId = type.id,
                name = field.name, fieldType = ft, options = field.options, isRequired = field.isRequired, sortOrder = field.sortOrder))
        }
        auditService.log(AuditEntry("Created", "ApplicationType", type.id.toString(), type.name,
            "Created application type \"${type.name}\"", currentUserService.userId, currentUserService.userName))
        return ResponseEntity.created(URI("/api/v1/applicationtypes/${type.id}")).body(applicationTypeRepository.findById(type.id).get().toDto())
    }

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody request: UpdateApplicationTypeRequest): ResponseEntity<Any> {
        val type = applicationTypeRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        type.name = request.name; type.description = request.description; type.updatedAt = Instant.now()
        if (request.customFields != null) {
            val existing = type.customFieldDefinitions.filter { !it.isArchived }
            val requestIds = request.customFields.mapNotNull { it.id }.toSet()
            existing.forEach { if (it.id !in requestIds) it.isArchived = true }
            request.customFields.forEach { field ->
                val ft = runCatching { CustomFieldType.valueOf(field.fieldType) }.getOrNull()
                    ?: return ResponseEntity.badRequest().body(mapOf("error" to "Invalid field type: ${field.fieldType}"))
                if (field.id != null) {
                    existing.find { it.id == field.id }?.apply { name = field.name; fieldType = ft; options = field.options; isRequired = field.isRequired; sortOrder = field.sortOrder }
                } else {
                    type.customFieldDefinitions.add(CustomFieldDefinition(entityType = EntityType.Application, applicationTypeId = type.id,
                        name = field.name, fieldType = ft, options = field.options, isRequired = field.isRequired, sortOrder = field.sortOrder))
                }
            }
        }
        applicationTypeRepository.save(type)
        auditService.log(AuditEntry("Updated", "ApplicationType", type.id.toString(), type.name,
            "Updated application type \"${type.name}\"", currentUserService.userId, currentUserService.userName))
        return ResponseEntity.ok(applicationTypeRepository.findById(type.id).get().toDto())
    }

    @PostMapping("/bulk-archive")
    fun bulkArchive(@RequestBody request: BulkArchiveRequest): ResponseEntity<BulkActionResponse> {
        var s = 0; var f = 0
        request.ids.forEach { id -> val t = applicationTypeRepository.findById(id).orElse(null); if (t == null || t.isArchived) { f++; return@forEach }
            t.isArchived = true; t.updatedAt = Instant.now(); applicationTypeRepository.save(t)
            auditService.log(AuditEntry("Archived", "ApplicationType", t.id.toString(), t.name, "Bulk archived", currentUserService.userId, currentUserService.userName)); s++ }
        return ResponseEntity.ok(BulkActionResponse(s, f))
    }

    @DeleteMapping("/{id}")
    fun archive(@PathVariable id: UUID): ResponseEntity<Any> {
        val t = applicationTypeRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        t.isArchived = true; t.updatedAt = Instant.now(); applicationTypeRepository.save(t)
        auditService.log(AuditEntry("Archived", "ApplicationType", t.id.toString(), t.name,
            "Archived application type \"${t.name}\"", currentUserService.userId, currentUserService.userName))
        return ResponseEntity.noContent().build()
    }

    private fun ApplicationType.toDto() = ApplicationTypeDto(id, name, description, isArchived, createdAt, updatedAt,
        customFieldDefinitions.filter { !it.isArchived }.sortedBy { it.sortOrder }
            .map { CustomFieldDefinitionDto(it.id, it.name, it.fieldType.name, it.options, it.isRequired, it.sortOrder) })
}
