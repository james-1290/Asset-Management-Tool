namespace AssetManagement.Api.DTOs;

public record LocationDto(
    Guid Id,
    string Name,
    string? Address,
    string? City,
    string? Country,
    bool IsArchived,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateLocationRequest(
    string Name,
    string? Address,
    string? City,
    string? Country
);

public record UpdateLocationRequest(
    string Name,
    string? Address,
    string? City,
    string? Country
);

public record LocationAssetDto(
    Guid Id,
    string Name,
    string AssetTag,
    string? AssetTypeName,
    string Status,
    string? AssignedPersonName
);

public record LocationPersonDto(
    Guid Id,
    string FullName,
    string? Email,
    string? Department,
    string? JobTitle
);
