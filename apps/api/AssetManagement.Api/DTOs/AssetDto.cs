namespace AssetManagement.Api.DTOs;

public record AssetDto(
    Guid Id,
    string Name,
    string AssetTag,
    string? SerialNumber,
    string Status,
    Guid AssetTypeId,
    string AssetTypeName,
    Guid? LocationId,
    string? LocationName,
    Guid? AssignedUserId,
    string? AssignedUserName,
    DateTime? PurchaseDate,
    decimal? PurchaseCost,
    DateTime? WarrantyExpiryDate,
    string? Notes,
    bool IsArchived,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateAssetRequest(
    string Name,
    string AssetTag,
    string? SerialNumber,
    string? Status,
    Guid AssetTypeId,
    Guid? LocationId,
    Guid? AssignedUserId,
    DateTime? PurchaseDate,
    decimal? PurchaseCost,
    DateTime? WarrantyExpiryDate,
    string? Notes
);

public record UpdateAssetRequest(
    string Name,
    string AssetTag,
    string? SerialNumber,
    string? Status,
    Guid AssetTypeId,
    Guid? LocationId,
    Guid? AssignedUserId,
    DateTime? PurchaseDate,
    decimal? PurchaseCost,
    DateTime? WarrantyExpiryDate,
    string? Notes
);
