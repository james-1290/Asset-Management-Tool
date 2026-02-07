using AssetManagement.Api.Models.Enums;

namespace AssetManagement.Api.Models;

public class Certificate
{
    public Guid Id { get; set; }
    public required string Name { get; set; }

    public Guid CertificateTypeId { get; set; }
    public CertificateType CertificateType { get; set; } = null!;

    public string? Issuer { get; set; }
    public string? Subject { get; set; }
    public string? Thumbprint { get; set; }
    public string? SerialNumber { get; set; }
    public DateTime? IssuedDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public CertificateStatus Status { get; set; } = CertificateStatus.Active;
    public bool AutoRenewal { get; set; }
    public string? Notes { get; set; }

    public Guid? AssetId { get; set; }
    public Asset? Asset { get; set; }

    public Guid? PersonId { get; set; }
    public Person? Person { get; set; }

    public Guid? LocationId { get; set; }
    public Location? Location { get; set; }

    public bool IsArchived { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CertificateHistory> History { get; set; } = [];
    public ICollection<CustomFieldValue> CustomFieldValues { get; set; } = [];
}
