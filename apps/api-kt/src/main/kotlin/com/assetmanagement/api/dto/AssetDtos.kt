package com.assetmanagement.api.dto

import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.*

data class AssetDto(
    val id: UUID,
    val name: String,
    val assetTag: String? = null,
    val serialNumber: String?,
    val status: String,
    val assetTypeId: UUID,
    val assetTypeName: String,
    val locationId: UUID?,
    val locationName: String?,
    val assignedPersonId: UUID?,
    val assignedPersonName: String?,
    val purchaseDate: LocalDate?,
    val purchaseCost: BigDecimal?,
    val warrantyExpiryDate: LocalDate?,
    val depreciationMonths: Int? = null,
    val bookValue: BigDecimal? = null,
    val totalDepreciation: BigDecimal? = null,
    val monthlyDepreciation: BigDecimal? = null,
    val soldDate: LocalDate?,
    val soldPrice: BigDecimal?,
    val retiredDate: LocalDate?,
    val notes: String?,
    val assetModelId: UUID?,
    val assetModelName: String?,
    val assetModelImageUrl: String?,
    val isArchived: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
    val entityVersion: Long,
    val customFieldValues: List<CustomFieldValueDto>
)

data class CreateAssetRequest(
    val name: String,
    val serialNumber: String? = null,
    val status: String? = null,
    val assetTypeId: UUID,
    val locationId: UUID? = null,
    val assignedPersonId: UUID? = null,
    val purchaseDate: LocalDate? = null,
    val purchaseCost: BigDecimal? = null,
    val warrantyExpiryDate: LocalDate? = null,
    val depreciationMonths: Int? = null,
    val notes: String? = null,
    val assetModelId: UUID? = null,
    val customFieldValues: List<CustomFieldValueInput>? = null
)

data class UpdateAssetRequest(
    val name: String,
    val serialNumber: String? = null,
    val status: String? = null,
    val assetTypeId: UUID,
    val locationId: UUID? = null,
    val assignedPersonId: UUID? = null,
    val purchaseDate: LocalDate? = null,
    val purchaseCost: BigDecimal? = null,
    val warrantyExpiryDate: LocalDate? = null,
    val depreciationMonths: Int? = null,
    val notes: String? = null,
    val assetModelId: UUID? = null,
    val entityVersion: Long? = null,
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
    val soldDate: LocalDate? = null,
    val notes: String? = null
)

data class BulkEditAssetsRequest(
    val ids: List<UUID>,
    val status: String? = null,
    val locationId: UUID? = null,
    val assignedPersonId: UUID? = null,
    val clearAssignedPerson: Boolean = false,
    val notes: String? = null,
    val clearNotes: Boolean = false
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
