package com.assetmanagement.api.dto

import java.math.BigDecimal
import java.time.Instant
import java.util.*

data class AssetDto(
    val id: UUID,
    val name: String,
    val assetTag: String,
    val serialNumber: String?,
    val status: String,
    val assetTypeId: UUID,
    val assetTypeName: String,
    val locationId: UUID?,
    val locationName: String?,
    val assignedPersonId: UUID?,
    val assignedPersonName: String?,
    val purchaseDate: Instant?,
    val purchaseCost: BigDecimal?,
    val warrantyExpiryDate: Instant?,
    val depreciationMonths: Int? = null,
    val bookValue: BigDecimal? = null,
    val totalDepreciation: BigDecimal? = null,
    val monthlyDepreciation: BigDecimal? = null,
    val soldDate: Instant?,
    val soldPrice: BigDecimal?,
    val retiredDate: Instant?,
    val notes: String?,
    val isArchived: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
    val customFieldValues: List<CustomFieldValueDto>
)

data class CreateAssetRequest(
    val name: String,
    val assetTag: String,
    val serialNumber: String? = null,
    val status: String? = null,
    val assetTypeId: UUID,
    val locationId: UUID? = null,
    val assignedPersonId: UUID? = null,
    val purchaseDate: Instant? = null,
    val purchaseCost: BigDecimal? = null,
    val warrantyExpiryDate: Instant? = null,
    val depreciationMonths: Int? = null,
    val notes: String? = null,
    val customFieldValues: List<CustomFieldValueInput>? = null
)

data class UpdateAssetRequest(
    val name: String,
    val assetTag: String,
    val serialNumber: String? = null,
    val status: String? = null,
    val assetTypeId: UUID,
    val locationId: UUID? = null,
    val assignedPersonId: UUID? = null,
    val purchaseDate: Instant? = null,
    val purchaseCost: BigDecimal? = null,
    val warrantyExpiryDate: Instant? = null,
    val depreciationMonths: Int? = null,
    val notes: String? = null,
    val customFieldValues: List<CustomFieldValueInput>? = null
)

data class CheckoutAssetRequest(
    val personId: UUID,
    val notes: String? = null
)

data class CheckinAssetRequest(
    val notes: String? = null
)

data class RetireAssetRequest(
    val notes: String? = null
)

data class SellAssetRequest(
    val soldPrice: BigDecimal? = null,
    val soldDate: Instant? = null,
    val notes: String? = null
)

data class AssetHistoryChangeDto(
    val fieldName: String,
    val oldValue: String?,
    val newValue: String?
)

data class AssetHistoryDto(
    val id: UUID,
    val eventType: String,
    val details: String?,
    val timestamp: Instant,
    val performedByUserName: String?,
    val changes: List<AssetHistoryChangeDto>
)
