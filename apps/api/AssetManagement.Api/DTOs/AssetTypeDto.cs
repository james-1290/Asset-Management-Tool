namespace AssetManagement.Api.DTOs;

public record AssetTypeDto(
    Guid Id,
    string Name,
    string? Description,
    bool IsArchived,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateAssetTypeRequest(
    string Name,
    string? Description
);

public record UpdateAssetTypeRequest(
    string Name,
    string? Description
);
