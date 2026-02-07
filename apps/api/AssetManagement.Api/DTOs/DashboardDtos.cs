namespace AssetManagement.Api.DTOs;

public record DashboardSummaryDto(
    int TotalAssets,
    decimal TotalValue
);

public record StatusBreakdownItemDto(
    string Status,
    int Count
);

public record WarrantyExpiryItemDto(
    Guid Id,
    string Name,
    string AssetTag,
    string AssetTypeName,
    DateTime WarrantyExpiryDate,
    int DaysUntilExpiry
);

public record AssetsByGroupItemDto(
    string Label,
    int Count
);

public record CheckedOutAssetDto(
    Guid Id,
    string Name,
    string AssetTag,
    string? AssignedPersonName,
    DateTime UpdatedAt
);
