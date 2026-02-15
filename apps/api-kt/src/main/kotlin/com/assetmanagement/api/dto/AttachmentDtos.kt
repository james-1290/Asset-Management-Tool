package com.assetmanagement.api.dto

import java.time.Instant
import java.util.*

data class AttachmentDto(
    val id: UUID,
    val entityType: String,
    val entityId: UUID,
    val fileName: String,
    val originalFileName: String,
    val fileSize: Long,
    val mimeType: String,
    val uploadedById: UUID?,
    val uploadedByName: String,
    val createdAt: Instant
)
