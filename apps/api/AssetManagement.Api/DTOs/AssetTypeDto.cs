namespace AssetManagement.Api.DTOs;

public record AssetTypeDto(
    Guid Id,
    string Name,
    string? Description,
    bool IsArchived,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<CustomFieldDefinitionDto> CustomFields
);

public record CreateAssetTypeRequest(
    string Name,
    string? Description,
    List<CustomFieldDefinitionInput>? CustomFields
);

public record UpdateAssetTypeRequest(
    string Name,
    string? Description,
    List<CustomFieldDefinitionInput>? CustomFields
);
