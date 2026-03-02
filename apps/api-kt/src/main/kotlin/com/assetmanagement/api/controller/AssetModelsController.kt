package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.AssetModel
import com.assetmanagement.api.repository.*
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
import com.assetmanagement.api.service.StorageService
import jakarta.persistence.criteria.Predicate
import org.springframework.core.io.InputStreamResource
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.net.URI
import java.time.Instant
import java.util.*

@RestController
@RequestMapping("/api/v1/asset-models")
class AssetModelsController(
    private val assetModelRepository: AssetModelRepository,
    private val assetTypeRepository: AssetTypeRepository,
    private val assetRepository: AssetRepository,
    private val storageService: StorageService,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService
) {

    companion object {
        private const val MAX_IMAGE_SIZE = 2 * 1024 * 1024L // 2MB
        private val ALLOWED_IMAGE_TYPES = mapOf(
            "image/jpeg" to "jpg",
            "image/png" to "png",
            "image/gif" to "gif"
        )
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET / — Paged list with search + assetTypeId filter
    // ──────────────────────────────────────────────────────────────────────────
    @GetMapping
    fun getAll(
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "25") pageSize: Int,
        @RequestParam(required = false) search: String?,
        @RequestParam(required = false) assetTypeId: UUID?,
        @RequestParam(defaultValue = "name") sortBy: String,
        @RequestParam(defaultValue = "asc") sortDir: String,
        @RequestParam(defaultValue = "false") includeArchived: Boolean
    ): ResponseEntity<Any> {
        val p = maxOf(1, page)
        val ps = pageSize.coerceIn(1, 100)

        val dir = if (sortDir.equals("desc", true)) Sort.Direction.DESC else Sort.Direction.ASC
        val sortProp = when (sortBy) {
            "name" -> "name"
            "manufacturer" -> "manufacturer"
            "createdAt" -> "createdAt"
            "updatedAt" -> "updatedAt"
            else -> "name"
        }
        val pageable = PageRequest.of(p - 1, ps, Sort.by(dir, sortProp))

        val spec = Specification<AssetModel> { root, _, cb ->
            val predicates = mutableListOf<Predicate>()

            if (!includeArchived) {
                predicates.add(cb.equal(root.get<Boolean>("isArchived"), false))
            }

            if (assetTypeId != null) {
                predicates.add(cb.equal(root.get<UUID>("assetTypeId"), assetTypeId))
            }

            if (!search.isNullOrBlank()) {
                val pattern = "%${search.lowercase()}%"
                predicates.add(
                    cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("manufacturer")), pattern)
                    )
                )
            }

            cb.and(*predicates.toTypedArray())
        }

        val result = assetModelRepository.findAll(spec, pageable)

        return ResponseEntity.ok(mapOf(
            "items" to result.content.map { toDto(it) },
            "total" to result.totalElements,
            "page" to p,
            "pageSize" to ps,
            "totalPages" to result.totalPages
        ))
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /{id}
    // ──────────────────────────────────────────────────────────────────────────
    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<Any> {
        val model = assetModelRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(toDto(model))
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POST / — Create
    // ──────────────────────────────────────────────────────────────────────────
    @PostMapping
    @Transactional
    fun create(@RequestBody request: CreateAssetModelRequest): ResponseEntity<Any> {
        if (request.name.isBlank()) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Name is required."))
        }

        val assetType = assetTypeRepository.findById(request.assetTypeId).orElse(null)
        if (assetType == null || assetType.isArchived) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Asset type not found."))
        }

        val model = AssetModel(
            assetTypeId = request.assetTypeId,
            name = request.name,
            manufacturer = request.manufacturer
        )
        assetModelRepository.save(model)

        auditService.log(AuditEntry(
            action = "Created",
            entityType = "AssetModel",
            entityId = model.id.toString(),
            entityName = model.name,
            details = "Created asset model \"${model.name}\" for type \"${assetType.name}\"",
            actorId = currentUserService.userId,
            actorName = currentUserService.userName
        ))

        val saved = assetModelRepository.findById(model.id).orElse(model)
        return ResponseEntity.created(URI("/api/v1/asset-models/${saved.id}")).body(toDto(saved))
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PUT /{id} — Update
    // ──────────────────────────────────────────────────────────────────────────
    @PutMapping("/{id}")
    @Transactional
    fun update(@PathVariable id: UUID, @RequestBody request: UpdateAssetModelRequest): ResponseEntity<Any> {
        val model = assetModelRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        if (request.name.isBlank()) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Name is required."))
        }

        model.name = request.name
        model.manufacturer = request.manufacturer
        model.updatedAt = Instant.now()
        assetModelRepository.save(model)

        auditService.log(AuditEntry(
            action = "Updated",
            entityType = "AssetModel",
            entityId = model.id.toString(),
            entityName = model.name,
            details = "Updated asset model \"${model.name}\"",
            actorId = currentUserService.userId,
            actorName = currentUserService.userName
        ))

        val saved = assetModelRepository.findById(model.id).orElse(model)
        return ResponseEntity.ok(toDto(saved))
    }

    // ──────────────────────────────────────────────────────────────────────────
    // DELETE /{id} — Archive
    // ──────────────────────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    @Transactional
    fun archive(@PathVariable id: UUID): ResponseEntity<Any> {
        val model = assetModelRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        if (model.isArchived) {
            return ResponseEntity.noContent().build()
        }

        // Check if any active assets use this model
        val assetCount = assetRepository.countByAssetModelIdAndIsArchivedFalse(id)
        if (assetCount > 0) {
            return ResponseEntity.badRequest().body(mapOf(
                "error" to "Cannot archive this model because $assetCount asset(s) are using it."
            ))
        }

        model.isArchived = true
        model.updatedAt = Instant.now()
        assetModelRepository.save(model)

        auditService.log(AuditEntry(
            action = "Archived",
            entityType = "AssetModel",
            entityId = model.id.toString(),
            entityName = model.name,
            details = "Archived asset model \"${model.name}\"",
            actorId = currentUserService.userId,
            actorName = currentUserService.userName
        ))

        return ResponseEntity.noContent().build()
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POST /{id}/image — Upload image (JPEG/PNG/GIF, max 2MB)
    // ──────────────────────────────────────────────────────────────────────────
    @PostMapping("/{id}/image", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @Transactional
    fun uploadImage(
        @PathVariable id: UUID,
        @RequestParam("file") file: MultipartFile
    ): ResponseEntity<Any> {
        val model = assetModelRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        if (file.isEmpty) {
            return ResponseEntity.badRequest().body(mapOf("error" to "File is empty"))
        }

        if (file.size > MAX_IMAGE_SIZE) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Image must be under 2MB"))
        }

        val mimeType = file.contentType ?: "application/octet-stream"
        val ext = ALLOWED_IMAGE_TYPES[mimeType]
            ?: return ResponseEntity.badRequest().body(mapOf("error" to "Only JPEG, PNG, and GIF images are allowed"))

        // Delete old image if exists
        if (!model.imageUrl.isNullOrBlank()) {
            try {
                storageService.delete(model.imageUrl!!)
            } catch (_: Exception) {
                // ignore cleanup errors
            }
        }

        val storageKey = "asset-model-images/${id}.${ext}"
        storageService.store(storageKey, file.inputStream, file.size)

        model.imageUrl = storageKey
        model.updatedAt = Instant.now()
        assetModelRepository.save(model)

        return ResponseEntity.ok(toDto(model))
    }

    // ──────────────────────────────────────────────────────────────────────────
    // DELETE /{id}/image — Remove image
    // ──────────────────────────────────────────────────────────────────────────
    @DeleteMapping("/{id}/image")
    @Transactional
    fun deleteImage(@PathVariable id: UUID): ResponseEntity<Any> {
        val model = assetModelRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        if (!model.imageUrl.isNullOrBlank()) {
            try {
                storageService.delete(model.imageUrl!!)
            } catch (_: Exception) {
                // ignore cleanup errors
            }
            model.imageUrl = null
            model.updatedAt = Instant.now()
            assetModelRepository.save(model)
        }

        return ResponseEntity.noContent().build()
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /{id}/image — Serve image with correct MIME type
    // ──────────────────────────────────────────────────────────────────────────
    @GetMapping("/{id}/image")
    fun getImage(@PathVariable id: UUID): ResponseEntity<InputStreamResource> {
        val model = assetModelRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        if (model.imageUrl.isNullOrBlank()) {
            return ResponseEntity.notFound().build()
        }

        val inputStream = try {
            storageService.load(model.imageUrl!!)
        } catch (_: Exception) {
            return ResponseEntity.notFound().build()
        }

        val ext = model.imageUrl!!.substringAfterLast('.', "").lowercase()
        val mediaType = when (ext) {
            "jpg", "jpeg" -> MediaType.IMAGE_JPEG
            "png" -> MediaType.IMAGE_PNG
            "gif" -> MediaType.IMAGE_GIF
            else -> MediaType.APPLICATION_OCTET_STREAM
        }

        return ResponseEntity.ok()
            .contentType(mediaType)
            .header(HttpHeaders.CACHE_CONTROL, "max-age=3600")
            .body(InputStreamResource(inputStream))
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POST /{id}/restore — Restore archived model
    // ──────────────────────────────────────────────────────────────────────────
    @PostMapping("/{id}/restore")
    @Transactional
    fun restore(@PathVariable id: UUID): ResponseEntity<Any> {
        val model = assetModelRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        if (!model.isArchived) {
            return ResponseEntity.ok(toDto(model))
        }

        model.isArchived = false
        model.updatedAt = Instant.now()
        assetModelRepository.save(model)

        auditService.log(AuditEntry(
            action = "Restored",
            entityType = "AssetModel",
            entityId = model.id.toString(),
            entityName = model.name,
            details = "Restored asset model \"${model.name}\"",
            actorId = currentUserService.userId,
            actorName = currentUserService.userName
        ))

        return ResponseEntity.ok(toDto(model))
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helper
    // ──────────────────────────────────────────────────────────────────────────
    private fun toDto(model: AssetModel): AssetModelDto {
        return AssetModelDto(
            id = model.id,
            assetTypeId = model.assetTypeId,
            assetTypeName = model.assetType?.name ?: "",
            name = model.name,
            manufacturer = model.manufacturer,
            imageUrl = model.imageUrl,
            isArchived = model.isArchived,
            createdAt = model.createdAt,
            updatedAt = model.updatedAt
        )
    }
}
