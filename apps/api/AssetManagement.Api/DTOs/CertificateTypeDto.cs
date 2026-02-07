namespace AssetManagement.Api.DTOs;

public record CertificateTypeDto(
    Guid Id,
    string Name,
    string? Description,
    bool IsArchived,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<CustomFieldDefinitionDto> CustomFields
);

public record CreateCertificateTypeRequest(
    string Name,
    string? Description,
    List<CustomFieldDefinitionInput>? CustomFields
);

public record UpdateCertificateTypeRequest(
    string Name,
    string? Description,
    List<CustomFieldDefinitionInput>? CustomFields
);
