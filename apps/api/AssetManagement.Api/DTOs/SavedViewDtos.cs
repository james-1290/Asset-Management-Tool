namespace AssetManagement.Api.DTOs;

public record SavedViewDto(
    Guid Id,
    string EntityType,
    string Name,
    bool IsDefault,
    string Configuration,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateSavedViewRequest(
    string EntityType,
    string Name,
    string Configuration
);

public record UpdateSavedViewRequest(
    string Name,
    string Configuration
);
