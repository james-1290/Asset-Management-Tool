namespace AssetManagement.Api.DTOs;

// Asset Summary Report
public record AssetSummaryReportDto(
    int TotalAssets,
    decimal TotalValue,
    List<StatusBreakdownItemDto> ByStatus,
    List<AssetsByGroupItemDto> ByType,
    List<AssetsByGroupItemDto> ByLocation
);

// Combined Expiry Report
public record ExpiryItemDto(
    Guid Id,
    string Name,
    string Category,       // "Warranty", "Certificate", "Licence"
    string TypeName,       // asset type / cert type / app type
    DateTime ExpiryDate,
    int DaysUntilExpiry,
    string Status
);

public record ExpiriesReportDto(
    List<ExpiryItemDto> Items,
    int TotalCount
);

// Licence Summary Report
public record LicenceSummaryReportDto(
    int TotalApplications,
    int Active,
    int Expired,
    int PendingRenewal,
    int Suspended,
    decimal TotalSpend,
    List<LicenceExpiryItemDto> ExpiringSoon
);

// Assignments Report
public record PersonAssignmentDto(
    Guid PersonId,
    string FullName,
    string? Email,
    int AssignedAssetCount,
    List<AssignedAssetBriefDto> Assets
);

public record AssignedAssetBriefDto(
    Guid Id,
    string Name,
    string AssetTag
);

public record AssignmentsReportDto(
    int TotalAssigned,
    int TotalPeople,
    List<PersonAssignmentDto> People
);

// Asset Lifecycle Report
public record AssetLifecycleReportDto(
    List<AssetsByAgeBucketDto> ByAge,
    List<WarrantyExpiryItemDto> PastWarranty,
    List<OldestAssetDto> OldestAssets
);

public record OldestAssetDto(
    Guid Id,
    string Name,
    string AssetTag,
    string AssetTypeName,
    DateTime PurchaseDate,
    int AgeDays
);
