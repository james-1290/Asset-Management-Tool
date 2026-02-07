using AssetManagement.Api.Models.Enums;

namespace AssetManagement.Api.Models;

public class CertificateHistory
{
    public Guid Id { get; set; }

    public Guid CertificateId { get; set; }
    public Certificate Certificate { get; set; } = null!;

    public CertificateHistoryEventType EventType { get; set; }

    public Guid? PerformedByUserId { get; set; }
    public User? PerformedByUser { get; set; }

    public string? Details { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public List<CertificateHistoryChange> Changes { get; set; } = [];
}
