package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.ApplicationType
import com.assetmanagement.api.model.CustomFieldDefinition
import com.assetmanagement.api.model.enums.CustomFieldType
import com.assetmanagement.api.model.enums.EntityType
import com.assetmanagement.api.repository.ApplicationRepository
import com.assetmanagement.api.repository.ApplicationTypeRepository
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
@RequestMapping(value = ["/api/v1/application-types", "/api/v1/applicationtypes"]) // legacy concatenated path kept as an alias
@PreAuthorize("hasAnyRole('Admin', 'Operator')")
class ApplicationTypesController(
    private val applicationTypeRepository: ApplicationTypeRepository,
    private val applicationRepository: ApplicationRepository,
    private val customFieldDefinitionService: CustomFieldDefinitionService,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService,
) {
    private val auditEntityType = "ApplicationType"

    private val crud = ArchivableTypeCrud(
        applicationTypeRepository, auditService, currentUserService, auditEntityType, "application",
        toDto = ::toDto,
        inUseCount = applicationRepository::countByApplicationTypeIdAndIsArchivedFalse,
    )

    private fun toDto(entity: ApplicationType): ApplicationTypeDto = ApplicationTypeDto(
        entity.id, entity.name, entity.description, entity.isArchived, entity.createdAt, entity.updatedAt,
        entity.customFieldDefinitions.filter { !it.isArchived }.sortedBy { it.sortOrder }
            .map { CustomFieldDefinitionDto(it.id, it.name, it.fieldType.name, it.options, it.isRequired, it.sortOrder) },
    )

    private fun newDefinition(typeId: UUID) = { ft: CustomFieldType, f: CustomFieldDefinitionInput ->
        CustomFieldDefinition(entityType = EntityType.Application, applicationTypeId = typeId, name = f.name,
            fieldType = ft, options = f.options, isRequired = f.isRequired, sortOrder = f.sortOrder)
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    fun getAll(
        @RequestParam(defaultValue = "1") page: Int, @RequestParam(defaultValue = "25") pageSize: Int,
        @RequestParam(required = false) search: String?, @RequestParam(defaultValue = "name") sortBy: String,
        @RequestParam(defaultValue = "asc") sortDir: String,
    ) = crud.getAll(page, pageSize, search, sortBy, sortDir)

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID) = crud.getById(id)

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/customfields")
    fun getCustomFields(@PathVariable id: UUID) = crud.getCustomFields(id)

    @DeleteMapping("/{id}")
    @Transactional
    fun archive(@PathVariable id: UUID) = crud.archive(id)

    @PostMapping("/bulk-archive")
    @Transactional
    fun bulkArchive(@RequestBody request: BulkArchiveRequest) = crud.bulkArchive(request)

    @PostMapping
    @Transactional
    fun create(@RequestBody request: CreateApplicationTypeRequest): ResponseEntity<Any> {
        val type = ApplicationType(name = request.name, description = request.description)
        applicationTypeRepository.save(type)
        customFieldDefinitionService.createDefinitions(request.customFields, newDefinition(type.id))
        auditService.log(AuditEntry("Created", auditEntityType, type.id.toString(), type.name,
            "Created application type \"${type.name}\"", currentUserService.userId, currentUserService.userName))
        return ResponseEntity.created(URI("/api/v1/applicationtypes/${type.id}"))
            .body(toDto(applicationTypeRepository.findById(type.id).orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND) }))
    }

    @PutMapping("/{id}")
    @Transactional
    fun update(@PathVariable id: UUID, @RequestBody request: UpdateApplicationTypeRequest): ResponseEntity<Any> {
        val type = applicationTypeRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        type.name = request.name
        type.description = request.description
        type.updatedAt = Instant.now()
        customFieldDefinitionService.syncDefinitions(type.customFieldDefinitions, request.customFields, newDefinition(type.id))
        applicationTypeRepository.save(type)
        auditService.log(AuditEntry("Updated", auditEntityType, type.id.toString(), type.name,
            "Updated application type \"${type.name}\"", currentUserService.userId, currentUserService.userName))
        return ResponseEntity.ok(toDto(applicationTypeRepository.findById(type.id).orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND) }))
    }
}
