package com.assetmanagement.api.dto

import java.time.Instant
import java.util.*

data class AssetModelDto(
    val id: UUID,
    val assetTypeId: UUID,
    val assetTypeName: String,
    val name: String,
    val manufacturer: String?,
    val imageUrl: String?,
    val isArchived: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class CreateAssetModelRequest(
    val assetTypeId: UUID,
    val name: String,
    val manufacturer: String? = null
)

data class UpdateAssetModelRequest(
    val name: String,
    val manufacturer: String? = null
)
