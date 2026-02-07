using AssetManagement.Api.Models.Enums;

namespace AssetManagement.Api.Models;

public class AssetHistory
{
    public Guid Id { get; set; }

    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;

    public AssetHistoryEventType EventType { get; set; }

    public Guid? PerformedByUserId { get; set; }
    public User? PerformedByUser { get; set; }

    public string? Details { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public List<AssetHistoryChange> Changes { get; set; } = [];
}
