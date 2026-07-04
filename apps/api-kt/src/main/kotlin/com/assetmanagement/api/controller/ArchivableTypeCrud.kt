package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.BulkActionResponse
import com.assetmanagement.api.dto.BulkArchiveRequest
import com.assetmanagement.api.dto.CustomFieldDefinitionDto
import com.assetmanagement.api.dto.PagedResponse
import com.assetmanagement.api.model.ArchivableType
import com.assetmanagement.api.repository.ArchivableTypeRepository
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
import com.assetmanagement.api.util.SqlUtils
import jakarta.persistence.criteria.Predicate
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.ResponseEntity
import java.time.Instant
import java.util.UUID

/**
 * Shared read + soft-delete CRUD logic for the entity-type controllers
 * (asset/certificate/application types). Constructed as a plain per-controller
 * helper — NOT a Spring bean and NOT a base controller — so the request-mapped
 * endpoints stay on each concrete `@RestController` (correctly proxied for
 * `@PreAuthorize`/`@Transactional`) and simply delegate here.
 */
class ArchivableTypeCrud<E : ArchivableType>(
    private val repository: ArchivableTypeRepository<E>,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService,
    /** Audit `entityType` label, e.g. "AssetType". */
    private val auditEntityType: String,
    /** Lower-case noun, e.g. "asset" → "asset type", "asset(s)". */
    private val typeNoun: String,
    private val toDto: (E) -> Any,
    /** Non-archived entities still referencing the type. */
    private val inUseCount: (UUID) -> Long,
) {
    fun getAll(page: Int, pageSize: Int, search: String?, sortBy: String, sortDir: String): ResponseEntity<PagedResponse<Any>> {
        val p = maxOf(1, page)
        val ps = pageSize.coerceIn(1, 100)
        val spec = Specification<E> { root, _, cb ->
            val preds = mutableListOf<Predicate>()
            preds.add(cb.equal(root.get<Boolean>("isArchived"), false))
            if (!search.isNullOrBlank()) {
                preds.add(cb.like(cb.lower(root.get("name")), "%${SqlUtils.escapeLikePattern(search.lowercase())}%", '\\'))
            }
            cb.and(*preds.toTypedArray())
        }
        val dir = if (sortDir.equals("desc", ignoreCase = true)) Sort.Direction.DESC else Sort.Direction.ASC
        val sort = Sort.by(dir, when (sortBy.lowercase()) { "createdat" -> "createdAt"; "description" -> "description"; else -> "name" })
        val result = repository.findAll(spec, PageRequest.of(p - 1, ps, sort))
        return ResponseEntity.ok(PagedResponse(result.content.map(toDto), p, ps, result.totalElements))
    }

    fun getById(id: UUID): ResponseEntity<Any> {
        val type = repository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(toDto(type))
    }

    fun getCustomFields(id: UUID): ResponseEntity<Any> {
        val type = repository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        val defs = type.customFieldDefinitions
            .filter { !it.isArchived }
            .sortedBy { it.sortOrder }
            .map { CustomFieldDefinitionDto(it.id, it.name, it.fieldType.name, it.options, it.isRequired, it.sortOrder) }
        return ResponseEntity.ok(defs)
    }

    fun archive(id: UUID): ResponseEntity<Any> {
        val type = repository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        val count = inUseCount(id)
        if (count > 0) {
            return ResponseEntity.status(409).body(mapOf(
                "error" to "Cannot delete \"${type.name}\" because it is used by $count $typeNoun(s). Reassign or delete those ${typeNoun}s first.",
            ))
        }
        type.isArchived = true
        type.updatedAt = Instant.now()
        repository.save(type)
        auditService.log(AuditEntry("Archived", auditEntityType, type.id.toString(), type.name,
            "Archived $typeNoun type \"${type.name}\"", currentUserService.userId, currentUserService.userName))
        return ResponseEntity.noContent().build()
    }

    fun bulkArchive(request: BulkArchiveRequest): ResponseEntity<BulkActionResponse> {
        var succeeded = 0
        var failed = 0
        request.ids.forEach { id ->
            val type = repository.findById(id).orElse(null)
            if (type == null || type.isArchived || inUseCount(id) > 0) {
                failed++
                return@forEach
            }
            type.isArchived = true
            type.updatedAt = Instant.now()
            repository.save(type)
            auditService.log(AuditEntry("Archived", auditEntityType, type.id.toString(), type.name,
                "Bulk archived $typeNoun type \"${type.name}\"", currentUserService.userId, currentUserService.userName))
            succeeded++
        }
        return ResponseEntity.ok(BulkActionResponse(succeeded, failed))
    }
}
