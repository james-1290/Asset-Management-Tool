namespace AssetManagement.Api.DTOs;

public record SystemSettingsDto(
    string OrgName,
    string Currency,
    string DateFormat,
    int DefaultPageSize
);

public record AlertSettingsDto(
    bool WarrantyEnabled,
    bool CertificateEnabled,
    bool LicenceEnabled,
    string Thresholds,
    string SmtpHost,
    int SmtpPort,
    string SmtpUsername,
    string SmtpPassword,
    string SmtpFromAddress,
    string SlackWebhookUrl,
    string Recipients
);
