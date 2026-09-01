package com.assetmanagement.api.dto

import java.time.Instant
import java.util.*

data class AssetTypeDto(
    val id: UUID,
    val name: String,
    val description: String?,
    val defaultDepreciationMonths: Int?,
    val nameTemplate: String?,
    val isArchived: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
    val customFields: List<CustomFieldDefinitionDto>,
    // Round-tripped by the client so a stale edit is refused (409) rather
    // than silently overwriting someone else's change.
    val entityVersion: Long
)

data class CreateAssetTypeRequest(
    val name: String,
    val description: String? = null,
    val defaultDepreciationMonths: Int? = null,
    val nameTemplate: String? = null,
    val customFields: List<CustomFieldDefinitionInput>? = null
)

data class UpdateAssetTypeRequest(
    val name: String,
    val description: String? = null,
    val defaultDepreciationMonths: Int? = null,
    val nameTemplate: String? = null,
    val customFields: List<CustomFieldDefinitionInput>? = null,
    // Optional: when absent the conflict check is skipped, which keeps
    // scripted API callers working as before.
    val entityVersion: Long? = null
)
