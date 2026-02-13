package com.assetmanagement.api.dto

import java.math.BigDecimal
import java.time.Instant
import java.util.*

data class AssetTemplateDto(
    val id: UUID,
    val assetTypeId: UUID,
    val assetTypeName: String,
    val name: String,
    val purchaseCost: BigDecimal?,
    val depreciationMonths: Int?,
    val locationId: UUID?,
    val locationName: String?,
    val notes: String?,
    val isArchived: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
    val customFieldValues: List<CustomFieldValueDto>
)

data class CreateAssetTemplateRequest(
    val assetTypeId: UUID,
    val name: String,
    val purchaseCost: BigDecimal? = null,
    val depreciationMonths: Int? = null,
    val locationId: UUID? = null,
    val notes: String? = null,
    val customFieldValues: List<CustomFieldValueInput>? = null
)

data class UpdateAssetTemplateRequest(
    val name: String,
    val purchaseCost: BigDecimal? = null,
    val depreciationMonths: Int? = null,
    val locationId: UUID? = null,
    val notes: String? = null,
    val customFieldValues: List<CustomFieldValueInput>? = null
)
