namespace AssetManagement.Api.DTOs;

public record CertificateDto(
    Guid Id,
    string Name,
    Guid CertificateTypeId,
    string CertificateTypeName,
    string? Issuer,
    string? Subject,
    string? Thumbprint,
    string? SerialNumber,
    DateTime? IssuedDate,
    DateTime? ExpiryDate,
    string Status,
    bool AutoRenewal,
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

public record CreateCertificateRequest(
    string Name,
    Guid CertificateTypeId,
    string? Issuer,
    string? Subject,
    string? Thumbprint,
    string? SerialNumber,
    DateTime? IssuedDate,
    DateTime? ExpiryDate,
    string? Status,
    bool AutoRenewal,
    string? Notes,
    Guid? AssetId,
    Guid? PersonId,
    Guid? LocationId,
    List<CustomFieldValueInput>? CustomFieldValues
);

public record UpdateCertificateRequest(
    string Name,
    Guid CertificateTypeId,
    string? Issuer,
    string? Subject,
    string? Thumbprint,
    string? SerialNumber,
    DateTime? IssuedDate,
    DateTime? ExpiryDate,
    string? Status,
    bool AutoRenewal,
    string? Notes,
    Guid? AssetId,
    Guid? PersonId,
    Guid? LocationId,
    List<CustomFieldValueInput>? CustomFieldValues
);

public record CertificateHistoryChangeDto(
    string FieldName,
    string? OldValue,
    string? NewValue
);

public record CertificateHistoryDto(
    Guid Id,
    string EventType,
    string? Details,
    DateTime Timestamp,
    string? PerformedByUserName,
    List<CertificateHistoryChangeDto> Changes
);
