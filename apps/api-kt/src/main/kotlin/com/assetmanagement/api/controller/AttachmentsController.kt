package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.AttachmentDto
import com.assetmanagement.api.model.Attachment
import com.assetmanagement.api.repository.AttachmentRepository
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
import java.util.*

@RestController
@RequestMapping("/api/v1/attachments")
class AttachmentsController(
    private val attachmentRepository: AttachmentRepository,
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
    }

    @PostMapping("/{entityType}/{entityId}", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun upload(
        @PathVariable entityType: String,
        @PathVariable entityId: UUID,
        @RequestParam("file") file: MultipartFile
    ): ResponseEntity<AttachmentDto> {
        if (entityType !in ALLOWED_ENTITY_TYPES) {
            return ResponseEntity.badRequest().build()
        }
        if (file.isEmpty) {
            return ResponseEntity.badRequest().build()
        }

        val mimeType = file.contentType ?: "application/octet-stream"
        if (mimeType !in ALLOWED_MIME_TYPES) {
            return ResponseEntity.badRequest().build()
        }

        val originalFileName = sanitizeFileName(file.originalFilename ?: "unnamed")
        val storedFileName = "${UUID.randomUUID()}-${originalFileName}"
        val storageKey = "${entityType}/${entityId}/${storedFileName}"

        storageService.store(storageKey, file.inputStream, file.size)

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
    }

    @GetMapping("/{entityType}/{entityId}")
    fun list(
        @PathVariable entityType: String,
        @PathVariable entityId: UUID
    ): ResponseEntity<List<AttachmentDto>> {
        if (entityType !in ALLOWED_ENTITY_TYPES) {
            return ResponseEntity.badRequest().build()
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

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"${attachment.originalFileName}\"")
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
