package com.assetmanagement.api.dto

import java.time.Instant
import java.util.*

data class AuditLogDto(
    val id: UUID,
    val actorName: String,
    val action: String,
    val entityType: String,
    val entityId: String,
    val entityName: String?,
    val source: String,
    val details: String?,
    val timestamp: Instant
)
