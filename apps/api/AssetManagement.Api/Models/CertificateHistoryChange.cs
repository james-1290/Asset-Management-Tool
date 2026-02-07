namespace AssetManagement.Api.Models;

public class CertificateHistoryChange
{
    public Guid Id { get; set; }

    public Guid CertificateHistoryId { get; set; }
    public CertificateHistory CertificateHistory { get; set; } = null!;

    public string FieldName { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
}
