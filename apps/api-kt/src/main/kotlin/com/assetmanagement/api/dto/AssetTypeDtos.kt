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
    val customFields: List<CustomFieldDefinitionDto>
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
    val customFields: List<CustomFieldDefinitionInput>? = null
)
