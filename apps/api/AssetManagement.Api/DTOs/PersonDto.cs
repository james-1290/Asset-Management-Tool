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
