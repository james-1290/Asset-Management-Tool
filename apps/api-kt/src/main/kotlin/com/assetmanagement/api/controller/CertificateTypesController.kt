package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.CertificateType
import com.assetmanagement.api.model.CustomFieldDefinition
import com.assetmanagement.api.model.enums.CustomFieldType
import com.assetmanagement.api.model.enums.EntityType
import com.assetmanagement.api.repository.CertificateTypeRepository
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
@RequestMapping("/api/v1/certificatetypes")
class CertificateTypesController(
    private val certificateTypeRepository: CertificateTypeRepository,
    private val customFieldDefinitionRepository: CustomFieldDefinitionRepository,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService
) {

    @GetMapping
    fun getAll(
        @RequestParam(defaultValue = "1") page: Int, @RequestParam(defaultValue = "25") pageSize: Int,
        @RequestParam(required = false) search: String?, @RequestParam(defaultValue = "name") sortBy: String,
        @RequestParam(defaultValue = "asc") sortDir: String
    ): ResponseEntity<PagedResponse<CertificateTypeDto>> {
        val p = maxOf(1, page); val ps = pageSize.coerceIn(1, 100)
        val spec = Specification<CertificateType> { root, _, cb ->
            val preds = mutableListOf<Predicate>()
            preds.add(cb.equal(root.get<Boolean>("isArchived"), false))
            if (!search.isNullOrBlank()) preds.add(cb.like(cb.lower(root.get("name")), "%${search.lowercase()}%"))
            cb.and(*preds.toTypedArray())
        }
        val dir = if (sortDir.equals("desc", ignoreCase = true)) Sort.Direction.DESC else Sort.Direction.ASC
        val sort = Sort.by(dir, when (sortBy.lowercase()) { "createdat" -> "createdAt"; "description" -> "description"; else -> "name" })
        val result = certificateTypeRepository.findAll(spec, PageRequest.of(p - 1, ps, sort))
        return ResponseEntity.ok(PagedResponse(result.content.map { it.toDto() }, p, ps, result.totalElements))
    }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<CertificateTypeDto> {
        val type = certificateTypeRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(type.toDto())
    }

    @GetMapping("/{id}/customfields")
    fun getCustomFields(@PathVariable id: UUID): ResponseEntity<Any> {
        if (!certificateTypeRepository.existsById(id)) return ResponseEntity.notFound().build()
        val defs = customFieldDefinitionRepository.findByCertificateTypeIdAndIsArchivedFalse(id)
            .sortedBy { it.sortOrder }.map { CustomFieldDefinitionDto(it.id, it.name, it.fieldType.name, it.options, it.isRequired, it.sortOrder) }
        return ResponseEntity.ok(defs)
    }

    @PostMapping
    fun create(@RequestBody request: CreateCertificateTypeRequest): ResponseEntity<Any> {
        val type = CertificateType(name = request.name, description = request.description)
        certificateTypeRepository.save(type)
        request.customFields?.forEach { field ->
            val ft = runCatching { CustomFieldType.valueOf(field.fieldType) }.getOrNull()
                ?: return ResponseEntity.badRequest().body(mapOf("error" to "Invalid field type: ${field.fieldType}"))
            customFieldDefinitionRepository.save(CustomFieldDefinition(entityType = EntityType.Certificate, certificateTypeId = type.id,
                name = field.name, fieldType = ft, options = field.options, isRequired = field.isRequired, sortOrder = field.sortOrder))
        }
        auditService.log(AuditEntry("Created", "CertificateType", type.id.toString(), type.name,
            "Created certificate type \"${type.name}\"", currentUserService.userId, currentUserService.userName))
        return ResponseEntity.created(URI("/api/v1/certificatetypes/${type.id}")).body(certificateTypeRepository.findById(type.id).get().toDto())
    }

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody request: UpdateCertificateTypeRequest): ResponseEntity<Any> {
        val type = certificateTypeRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
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
                    type.customFieldDefinitions.add(CustomFieldDefinition(entityType = EntityType.Certificate, certificateTypeId = type.id,
                        name = field.name, fieldType = ft, options = field.options, isRequired = field.isRequired, sortOrder = field.sortOrder))
                }
            }
        }
        certificateTypeRepository.save(type)
        auditService.log(AuditEntry("Updated", "CertificateType", type.id.toString(), type.name,
            "Updated certificate type \"${type.name}\"", currentUserService.userId, currentUserService.userName))
        return ResponseEntity.ok(certificateTypeRepository.findById(type.id).get().toDto())
    }

    @PostMapping("/bulk-archive")
    fun bulkArchive(@RequestBody request: BulkArchiveRequest): ResponseEntity<BulkActionResponse> {
        var s = 0; var f = 0
        request.ids.forEach { id -> val t = certificateTypeRepository.findById(id).orElse(null); if (t == null || t.isArchived) { f++; return@forEach }
            t.isArchived = true; t.updatedAt = Instant.now(); certificateTypeRepository.save(t)
            auditService.log(AuditEntry("Archived", "CertificateType", t.id.toString(), t.name, "Bulk archived", currentUserService.userId, currentUserService.userName)); s++ }
        return ResponseEntity.ok(BulkActionResponse(s, f))
    }

    @DeleteMapping("/{id}")
    fun archive(@PathVariable id: UUID): ResponseEntity<Any> {
        val t = certificateTypeRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        t.isArchived = true; t.updatedAt = Instant.now(); certificateTypeRepository.save(t)
        auditService.log(AuditEntry("Archived", "CertificateType", t.id.toString(), t.name,
            "Archived certificate type \"${t.name}\"", currentUserService.userId, currentUserService.userName))
        return ResponseEntity.noContent().build()
    }

    private fun CertificateType.toDto() = CertificateTypeDto(id, name, description, isArchived, createdAt, updatedAt,
        customFieldDefinitions.filter { !it.isArchived }.sortedBy { it.sortOrder }
            .map { CustomFieldDefinitionDto(it.id, it.name, it.fieldType.name, it.options, it.isRequired, it.sortOrder) })
}
