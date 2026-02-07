using AssetManagement.Api.Models.Enums;

namespace AssetManagement.Api.Models;

public class ApplicationHistory
{
    public Guid Id { get; set; }

    public Guid ApplicationId { get; set; }
    public Application Application { get; set; } = null!;

    public ApplicationHistoryEventType EventType { get; set; }

    public Guid? PerformedByUserId { get; set; }
    public User? PerformedByUser { get; set; }

    public string? Details { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public List<ApplicationHistoryChange> Changes { get; set; } = [];
}
