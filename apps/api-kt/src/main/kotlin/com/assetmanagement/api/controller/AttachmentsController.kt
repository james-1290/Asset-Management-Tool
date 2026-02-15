package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.AttachmentDto
import com.assetmanagement.api.model.Attachment
import com.assetmanagement.api.repository.*
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
import com.assetmanagement.api.service.StorageService
import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.*

@RestController
@RequestMapping("/api/v1/attachments")
class AttachmentsController(
    private val attachmentRepository: AttachmentRepository,
    private val assetRepository: AssetRepository,
    private val certificateRepository: CertificateRepository,
    private val applicationRepository: ApplicationRepository,
    private val storageService: StorageService,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService
) {

    companion object {
        private val ALLOWED_ENTITY_TYPES = setOf("Asset", "Certificate", "Application")

        private val ALLOWED_MIME_TYPES = setOf(
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/gif",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/msword",
            "application/vnd.ms-excel",
            "text/plain",
            "text/csv"
        )

        private val ALLOWED_EXTENSIONS = setOf(
            "pdf", "jpg", "jpeg", "png", "gif",
            "docx", "xlsx", "doc", "xls", "txt", "csv"
        )
    }

    @PostMapping("/{entityType}/{entityId}", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun upload(
        @PathVariable entityType: String,
        @PathVariable entityId: UUID,
        @RequestParam("file") file: MultipartFile
    ): ResponseEntity<*> {
        if (entityType !in ALLOWED_ENTITY_TYPES) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Invalid entity type"))
        }
        if (file.isEmpty) {
            return ResponseEntity.badRequest().body(mapOf("error" to "File is empty"))
        }

        // Validate entity exists
        val entityExists = when (entityType) {
            "Asset" -> assetRepository.existsById(entityId)
            "Certificate" -> certificateRepository.existsById(entityId)
            "Application" -> applicationRepository.existsById(entityId)
            else -> false
        }
        if (!entityExists) {
            return ResponseEntity.badRequest().body(mapOf("error" to "$entityType not found"))
        }

        val mimeType = file.contentType ?: "application/octet-stream"
        if (mimeType !in ALLOWED_MIME_TYPES) {
            return ResponseEntity.badRequest().body(mapOf("error" to "File type not allowed"))
        }

        val originalFileName = sanitizeFileName(file.originalFilename ?: "unnamed")
        val extension = originalFileName.substringAfterLast('.', "").lowercase()
        if (extension !in ALLOWED_EXTENSIONS) {
            return ResponseEntity.badRequest().body(mapOf("error" to "File extension not allowed"))
        }

        val storedFileName = "${UUID.randomUUID()}-${originalFileName}"
        val storageKey = "${entityType}/${entityId}/${storedFileName}"

        storageService.store(storageKey, file.inputStream, file.size)

        try {
            val attachment = Attachment(
                entityType = entityType,
                entityId = entityId,
                fileName = storedFileName,
                originalFileName = originalFileName,
                fileSize = file.size,
                mimeType = mimeType,
                storageKey = storageKey,
                uploadedById = currentUserService.userId,
                uploadedByName = currentUserService.userName
            )
            attachmentRepository.save(attachment)

            auditService.log(AuditEntry(
                action = "AttachmentUploaded",
                entityType = entityType,
                entityId = entityId.toString(),
                entityName = originalFileName,
                details = "Uploaded attachment: $originalFileName (${formatFileSize(file.size)})",
                actorId = currentUserService.userId,
                actorName = currentUserService.userName
            ))

            return ResponseEntity.ok(toDto(attachment))
        } catch (e: Exception) {
            storageService.delete(storageKey)
            throw e
        }
    }

    @GetMapping("/{entityType}/{entityId}")
    fun list(
        @PathVariable entityType: String,
        @PathVariable entityId: UUID
    ): ResponseEntity<*> {
        if (entityType !in ALLOWED_ENTITY_TYPES) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Invalid entity type"))
        }

        val attachments = attachmentRepository
            .findByEntityTypeAndEntityIdAndIsArchivedFalseOrderByCreatedAtDesc(entityType, entityId)

        return ResponseEntity.ok(attachments.map { toDto(it) })
    }

    @GetMapping("/{id}/download")
    fun download(@PathVariable id: UUID): ResponseEntity<InputStreamResource> {
        val attachment = attachmentRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        if (attachment.isArchived) {
            return ResponseEntity.notFound().build()
        }

        val inputStream = storageService.load(attachment.storageKey)
        val resource = InputStreamResource(inputStream)

        val encodedFilename = URLEncoder.encode(attachment.originalFileName, StandardCharsets.UTF_8)
            .replace("+", "%20")

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''$encodedFilename")
            .contentType(MediaType.parseMediaType(attachment.mimeType))
            .contentLength(attachment.fileSize)
            .body(resource)
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {
        val attachment = attachmentRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        if (attachment.isArchived) {
            return ResponseEntity.notFound().build()
        }

        attachment.isArchived = true
        attachmentRepository.save(attachment)

        // Clean up the stored file
        try {
            storageService.delete(attachment.storageKey)
        } catch (_: Exception) {
            // Log but don't fail — DB record is the source of truth
        }

        auditService.log(AuditEntry(
            action = "AttachmentDeleted",
            entityType = attachment.entityType,
            entityId = attachment.entityId.toString(),
            entityName = attachment.originalFileName,
            details = "Deleted attachment: ${attachment.originalFileName}",
            actorId = currentUserService.userId,
            actorName = currentUserService.userName
        ))

        return ResponseEntity.noContent().build()
    }

    private fun toDto(attachment: Attachment) = AttachmentDto(
        id = attachment.id,
        entityType = attachment.entityType,
        entityId = attachment.entityId,
        fileName = attachment.fileName,
        originalFileName = attachment.originalFileName,
        fileSize = attachment.fileSize,
        mimeType = attachment.mimeType,
        uploadedById = attachment.uploadedById,
        uploadedByName = attachment.uploadedByName,
        createdAt = attachment.createdAt
    )

    private fun sanitizeFileName(name: String): String {
        return name.replace(Regex("[\\\\/:*?\"<>|]"), "_")
            .replace("..", "_")
            .take(255)
    }

    private fun formatFileSize(bytes: Long): String {
        return when {
            bytes < 1024 -> "$bytes B"
            bytes < 1024 * 1024 -> "${bytes / 1024} KB"
            else -> "${bytes / (1024 * 1024)} MB"
        }
    }
}
