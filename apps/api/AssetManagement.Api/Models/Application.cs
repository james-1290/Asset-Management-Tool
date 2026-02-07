using AssetManagement.Api.Models.Enums;

namespace AssetManagement.Api.Models;

public class Application
{
    public Guid Id { get; set; }
    public required string Name { get; set; }

    public Guid ApplicationTypeId { get; set; }
    public ApplicationType ApplicationType { get; set; } = null!;

    public string? Publisher { get; set; }
    public string? Version { get; set; }
    public string? LicenceKey { get; set; }
    public LicenceType? LicenceType { get; set; }
    public int? MaxSeats { get; set; }
    public int? UsedSeats { get; set; }
    public DateTime? PurchaseDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public decimal? PurchaseCost { get; set; }
    public bool AutoRenewal { get; set; }
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Active;
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

    public ICollection<ApplicationHistory> History { get; set; } = [];
    public ICollection<CustomFieldValue> CustomFieldValues { get; set; } = [];
}
