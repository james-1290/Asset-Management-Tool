namespace AssetManagement.Api.DTOs;

public record CustomFieldDefinitionDto(
    Guid Id,
    string Name,
    string FieldType,
    string? Options,
    bool IsRequired,
    int SortOrder
);

public record CustomFieldDefinitionInput(
    Guid? Id,
    string Name,
    string FieldType,
    string? Options,
    bool IsRequired,
    int SortOrder
);

public record CustomFieldValueDto(
    Guid FieldDefinitionId,
    string FieldName,
    string FieldType,
    string? Value
);

public record CustomFieldValueInput(
    Guid FieldDefinitionId,
    string? Value
);
