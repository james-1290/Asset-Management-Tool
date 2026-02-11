package com.assetmanagement.api.dto

import java.time.Instant
import java.util.*

data class SavedViewDto(
    val id: UUID,
    val entityType: String,
    val name: String,
    val isDefault: Boolean,
    val configuration: String,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class CreateSavedViewRequest(
    val entityType: String,
    val name: String,
    val configuration: String
)

data class UpdateSavedViewRequest(
    val name: String,
    val configuration: String
)
