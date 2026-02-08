using AssetManagement.Api.Models.Enums;

namespace AssetManagement.Api.Models;

public class PersonHistory
{
    public Guid Id { get; set; }

    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;

    public PersonHistoryEventType EventType { get; set; }

    public Guid? PerformedByUserId { get; set; }
    public User? PerformedByUser { get; set; }

    public string? Details { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public List<PersonHistoryChange> Changes { get; set; } = [];
}
