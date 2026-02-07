namespace AssetManagement.Api.DTOs;

public record ApplicationTypeDto(
    Guid Id,
    string Name,
    string? Description,
    bool IsArchived,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<CustomFieldDefinitionDto> CustomFields
);

public record CreateApplicationTypeRequest(
    string Name,
    string? Description,
    List<CustomFieldDefinitionInput>? CustomFields
);

public record UpdateApplicationTypeRequest(
    string Name,
    string? Description,
    List<CustomFieldDefinitionInput>? CustomFields
);
