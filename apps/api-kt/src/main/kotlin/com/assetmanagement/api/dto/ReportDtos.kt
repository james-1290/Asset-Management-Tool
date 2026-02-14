package com.assetmanagement.api.dto

import java.math.BigDecimal
import java.time.Instant
import java.util.*

data class AssetSummaryReportDto(
    val totalAssets: Int,
    val totalValue: BigDecimal,
    val byStatus: List<StatusBreakdownItemDto>,
    val byType: List<AssetsByGroupItemDto>,
    val byLocation: List<AssetsByGroupItemDto>
)

data class ExpiryItemDto(
    val id: UUID,
    val name: String,
    val category: String,
    val typeName: String,
    val expiryDate: Instant,
    val daysUntilExpiry: Int,
    val status: String
)

data class ExpiriesReportDto(
    val items: List<ExpiryItemDto>,
    val totalCount: Int
)

data class LicenceSummaryReportDto(
    val totalApplications: Int,
    val active: Int,
    val expired: Int,
    val pendingRenewal: Int,
    val suspended: Int,
    val totalSpend: BigDecimal,
    val expiringSoon: List<LicenceExpiryItemDto>
)

data class PersonAssignmentDto(
    val personId: UUID,
    val fullName: String,
    val email: String?,
    val assignedAssetCount: Int,
    val assets: List<AssignedAssetBriefDto>
)

data class AssignedAssetBriefDto(
    val id: UUID,
    val name: String
)

data class AssignmentsReportDto(
    val totalAssigned: Int,
    val totalPeople: Int,
    val people: List<PersonAssignmentDto>
)

data class AssetLifecycleReportDto(
    val byAge: List<AssetsByAgeBucketDto>,
    val pastWarranty: List<WarrantyExpiryItemDto>,
    val oldestAssets: List<OldestAssetDto>
)

data class OldestAssetDto(
    val id: UUID,
    val name: String,
    val assetTypeName: String,
    val purchaseDate: Instant,
    val ageDays: Int
)

data class DepreciationReportDto(
    val totalOriginalCost: BigDecimal,
    val totalAccumulatedDepreciation: BigDecimal,
    val totalBookValue: BigDecimal,
    val groups: List<DepreciationGroupDto>
)

data class DepreciationGroupDto(
    val assetTypeName: String,
    val subtotalOriginalCost: BigDecimal,
    val subtotalAccumulatedDepreciation: BigDecimal,
    val subtotalBookValue: BigDecimal,
    val assets: List<DepreciationAssetDto>
)

data class DepreciationAssetDto(
    val id: UUID,
    val name: String,
    val assetTypeName: String,
    val purchaseDate: Instant?,
    val originalCost: BigDecimal,
    val depreciationMethod: String,
    val usefulLifeYears: Int?,
    val accumulatedDepreciation: BigDecimal,
    val currentBookValue: BigDecimal,
    val remainingUsefulLifeMonths: Int?
)
