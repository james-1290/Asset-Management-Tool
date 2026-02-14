package com.assetmanagement.api.dto

import java.math.BigDecimal
import java.time.Instant
import java.util.*

data class DashboardSummaryDto(
    val totalAssets: Int,
    val totalValue: BigDecimal,
    val totalBookValue: BigDecimal
)

data class StatusBreakdownItemDto(
    val status: String,
    val count: Int
)

data class WarrantyExpiryItemDto(
    val id: UUID,
    val name: String,
    val assetTypeName: String,
    val warrantyExpiryDate: Instant,
    val daysUntilExpiry: Int
)

data class AssetsByGroupItemDto(
    val label: String,
    val count: Int
)

data class CheckedOutAssetDto(
    val id: UUID,
    val name: String,
    val assignedPersonName: String?,
    val updatedAt: Instant
)

data class RecentlyAddedAssetDto(
    val id: UUID,
    val name: String,
    val assetTypeName: String,
    val createdAt: Instant
)

data class AssetsByAgeBucketDto(
    val bucket: String,
    val count: Int
)

data class UnassignedAssetDto(
    val id: UUID,
    val name: String,
    val assetTypeName: String
)

data class ValueByLocationDto(
    val locationName: String,
    val totalValue: BigDecimal
)

data class CertificateExpiryItemDto(
    val id: UUID,
    val name: String,
    val certificateTypeName: String,
    val expiryDate: Instant,
    val daysUntilExpiry: Int,
    val status: String
)

data class CertificateSummaryDto(
    val totalCertificates: Int,
    val active: Int,
    val expired: Int,
    val pendingRenewal: Int,
    val revoked: Int
)

data class LicenceExpiryItemDto(
    val id: UUID,
    val name: String,
    val applicationTypeName: String,
    val expiryDate: Instant,
    val daysUntilExpiry: Int,
    val status: String
)

data class ApplicationSummaryDto(
    val totalApplications: Int,
    val active: Int,
    val expired: Int,
    val pendingRenewal: Int,
    val suspended: Int
)

data class InventorySnapshotItemDto(
    val label: String,
    val count: Int,
    val filterUrl: String
)
