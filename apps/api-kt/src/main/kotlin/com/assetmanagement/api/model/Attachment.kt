package com.assetmanagement.api.model

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "attachments")
class Attachment(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "entity_type", nullable = false, columnDefinition = "VARCHAR(50)")
    var entityType: String = "",

    @Column(name = "entity_id", nullable = false, columnDefinition = "CHAR(36)")
    var entityId: UUID = UUID.randomUUID(),

    @Column(name = "file_name", nullable = false, length = 500)
    var fileName: String = "",

    @Column(name = "original_file_name", nullable = false, length = 500)
    var originalFileName: String = "",

    @Column(name = "file_size", nullable = false)
    var fileSize: Long = 0,

    @Column(name = "mime_type", nullable = false)
    var mimeType: String = "",

    @Column(name = "storage_key", nullable = false, length = 1000)
    var storageKey: String = "",

    @Column(name = "uploaded_by_id", columnDefinition = "CHAR(36)")
    var uploadedById: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_id", insertable = false, updatable = false)
    var uploadedBy: User? = null,

    @Column(name = "uploaded_by_name", nullable = false)
    var uploadedByName: String = "",

    @Column(name = "is_archived", nullable = false)
    var isArchived: Boolean = false,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now()
)
