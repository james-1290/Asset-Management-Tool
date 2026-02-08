namespace AssetManagement.Api.DTOs;

public record PersonDto(
    Guid Id,
    string FullName,
    string? Email,
    string? Department,
    string? JobTitle,
    Guid? LocationId,
    string? LocationName,
    bool IsArchived,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreatePersonRequest(
    string FullName,
    string? Email,
    string? Department,
    string? JobTitle,
    Guid? LocationId
);

public record UpdatePersonRequest(
    string FullName,
    string? Email,
    string? Department,
    string? JobTitle,
    Guid? LocationId
);

public record PersonSearchResult(
    Guid Id,
    string FullName
);

public record PersonHistoryChangeDto(
    string FieldName,
    string? OldValue,
    string? NewValue
);

public record PersonHistoryDto(
    Guid Id,
    string EventType,
    string? Details,
    DateTime Timestamp,
    string? PerformedByUserName,
    List<PersonHistoryChangeDto> Changes
);

public record AssignedAssetDto(
    Guid Id,
    string Name,
    string AssetTag,
    string? SerialNumber,
    string Status,
    string AssetTypeName,
    string? LocationName
);
