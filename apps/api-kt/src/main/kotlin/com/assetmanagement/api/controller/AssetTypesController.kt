package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.AssetType
import com.assetmanagement.api.model.CustomFieldDefinition
import com.assetmanagement.api.model.enums.CustomFieldType
import com.assetmanagement.api.model.enums.EntityType
import com.assetmanagement.api.repository.AssetRepository
import com.assetmanagement.api.repository.AssetTypeRepository
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
import com.assetmanagement.api.service.CustomFieldDefinitionService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.net.URI
import java.time.Instant
import java.util.*

@RestController
@RequestMapping(value = ["/api/v1/asset-types", "/api/v1/assettypes"]) // legacy concatenated path kept as an alias
@PreAuthorize("hasAnyRole('Admin', 'Operator')")
class AssetTypesController(
    private val assetTypeRepository: AssetTypeRepository,
    private val assetRepository: AssetRepository,
    private val customFieldDefinitionService: CustomFieldDefinitionService,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService,
) {
    private val auditEntityType = "AssetType"

    private val crud = ArchivableTypeCrud(
        assetTypeRepository, auditService, currentUserService, auditEntityType, "asset",
        toDto = ::toDto,
        inUseCount = assetRepository::countByAssetTypeIdAndIsArchivedFalse,
    )

    private fun toDto(entity: AssetType): AssetTypeDto = AssetTypeDto(
        entity.id, entity.name, entity.description, entity.defaultDepreciationMonths, entity.nameTemplate,
        entity.isArchived, entity.createdAt, entity.updatedAt,
        entity.customFieldDefinitions.filter { !it.isArchived }.sortedBy { it.sortOrder }
            .map { CustomFieldDefinitionDto(it.id, it.name, it.fieldType.name, it.options, it.isRequired, it.sortOrder) },
    )

    private fun newDefinition(typeId: UUID) = { ft: CustomFieldType, f: CustomFieldDefinitionInput ->
        CustomFieldDefinition(entityType = EntityType.Asset, assetTypeId = typeId, name = f.name,
            fieldType = ft, options = f.options, isRequired = f.isRequired, sortOrder = f.sortOrder)
    }

    @PreAuthorize("hasAnyRole('Admin','Operator','User')")
    @GetMapping
    @Transactional(readOnly = true)
    fun getAll(
        @RequestParam(defaultValue = "1") page: Int, @RequestParam(defaultValue = "25") pageSize: Int,
        @RequestParam(required = false) search: String?, @RequestParam(defaultValue = "name") sortBy: String,
        @RequestParam(defaultValue = "asc") sortDir: String,
    ) = crud.getAll(page, pageSize, search, sortBy, sortDir)

    @PreAuthorize("hasAnyRole('Admin','Operator','User')")
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    fun getById(@PathVariable id: UUID) = crud.getById(id)

    @PreAuthorize("hasAnyRole('Admin','Operator','User')")
    @GetMapping("/{id}/customfields")
    @Transactional(readOnly = true)
    fun getCustomFields(@PathVariable id: UUID) = crud.getCustomFields(id)

    @DeleteMapping("/{id}")
    @Transactional
    fun archive(@PathVariable id: UUID) = crud.archive(id)

    @PostMapping("/bulk-archive")
    @Transactional
    fun bulkArchive(@RequestBody request: BulkArchiveRequest) = crud.bulkArchive(request)

    @PostMapping
    @Transactional
    fun create(@RequestBody request: CreateAssetTypeRequest): ResponseEntity<Any> {
        val type = AssetType(name = request.name, description = request.description,
            defaultDepreciationMonths = request.defaultDepreciationMonths, nameTemplate = request.nameTemplate)
        assetTypeRepository.save(type)
        customFieldDefinitionService.createDefinitions(request.customFields, newDefinition(type.id))
        auditService.log(AuditEntry("Created", auditEntityType, type.id.toString(), type.name,
            "Created asset type \"${type.name}\"", currentUserService.userId, currentUserService.userName))
        return ResponseEntity.created(URI("/api/v1/assettypes/${type.id}"))
            .body(toDto(assetTypeRepository.findById(type.id).orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND) }))
    }

    @PutMapping("/{id}")
    @Transactional
    fun update(@PathVariable id: UUID, @RequestBody request: UpdateAssetTypeRequest): ResponseEntity<Any> {
        val type = assetTypeRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        type.name = request.name
        type.description = request.description
        type.defaultDepreciationMonths = request.defaultDepreciationMonths
        type.nameTemplate = request.nameTemplate
        type.updatedAt = Instant.now()
        customFieldDefinitionService.syncDefinitions(type.customFieldDefinitions, request.customFields, newDefinition(type.id))
        assetTypeRepository.save(type)
        auditService.log(AuditEntry("Updated", auditEntityType, type.id.toString(), type.name,
            "Updated asset type \"${type.name}\"", currentUserService.userId, currentUserService.userName))
        return ResponseEntity.ok(toDto(assetTypeRepository.findById(type.id).orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND) }))
    }
}
