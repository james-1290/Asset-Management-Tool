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
    val updatedAt: Instant,
    // Round-tripped by the client so a stale edit is refused (409) rather
    // than silently overwriting someone else's change.
    val entityVersion: Long
)

data class CreateAssetModelRequest(
    val assetTypeId: UUID,
    val name: String,
    val manufacturer: String? = null
)

data class UpdateAssetModelRequest(
    val name: String,
    val manufacturer: String? = null,
    // Optional: when absent the conflict check is skipped, which keeps
    // scripted API callers working as before.
    val entityVersion: Long? = null
)
