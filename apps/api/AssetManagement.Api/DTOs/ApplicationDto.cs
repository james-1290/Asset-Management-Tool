namespace AssetManagement.Api.DTOs;

public record ApplicationDto(
    Guid Id,
    string Name,
    Guid ApplicationTypeId,
    string ApplicationTypeName,
    string? Publisher,
    string? Version,
    string? LicenceKey,
    string? LicenceType,
    int? MaxSeats,
    int? UsedSeats,
    DateTime? PurchaseDate,
    DateTime? ExpiryDate,
    decimal? PurchaseCost,
    bool AutoRenewal,
    string Status,
    string? Notes,
    Guid? AssetId,
    string? AssetName,
    Guid? PersonId,
    string? PersonName,
    Guid? LocationId,
    string? LocationName,
    bool IsArchived,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<CustomFieldValueDto> CustomFieldValues
);

public record CreateApplicationRequest(
    string Name,
    Guid ApplicationTypeId,
    string? Publisher,
    string? Version,
    string? LicenceKey,
    string? LicenceType,
    int? MaxSeats,
    int? UsedSeats,
    DateTime? PurchaseDate,
    DateTime? ExpiryDate,
    decimal? PurchaseCost,
    bool AutoRenewal,
    string? Status,
    string? Notes,
    Guid? AssetId,
    Guid? PersonId,
    Guid? LocationId,
    List<CustomFieldValueInput>? CustomFieldValues
);

public record UpdateApplicationRequest(
    string Name,
    Guid ApplicationTypeId,
    string? Publisher,
    string? Version,
    string? LicenceKey,
    string? LicenceType,
    int? MaxSeats,
    int? UsedSeats,
    DateTime? PurchaseDate,
    DateTime? ExpiryDate,
    decimal? PurchaseCost,
    bool AutoRenewal,
    string? Status,
    string? Notes,
    Guid? AssetId,
    Guid? PersonId,
    Guid? LocationId,
    List<CustomFieldValueInput>? CustomFieldValues
);

public record ApplicationHistoryChangeDto(
    string FieldName,
    string? OldValue,
    string? NewValue
);

public record ApplicationHistoryDto(
    Guid Id,
    string EventType,
    string? Details,
    DateTime Timestamp,
    string? PerformedByUserName,
    List<ApplicationHistoryChangeDto> Changes
);
