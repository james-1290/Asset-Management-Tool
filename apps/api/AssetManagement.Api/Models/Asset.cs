using AssetManagement.Api.Models.Enums;

namespace AssetManagement.Api.Models;

public class Asset
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string AssetTag { get; set; }
    public string? SerialNumber { get; set; }
    public AssetStatus Status { get; set; } = AssetStatus.Available;

    public Guid AssetTypeId { get; set; }
    public AssetType AssetType { get; set; } = null!;

    public Guid? LocationId { get; set; }
    public Location? Location { get; set; }

    public Guid? AssignedPersonId { get; set; }
    public Person? AssignedPerson { get; set; }

    public DateTime? WarrantyExpiryDate { get; set; }
    public DateTime? PurchaseDate { get; set; }
    public decimal? PurchaseCost { get; set; }
    public int? DepreciationMonths { get; set; }
    public DateTime? SoldDate { get; set; }
    public decimal? SoldPrice { get; set; }
    public DateTime? RetiredDate { get; set; }
    public string? Notes { get; set; }

    public bool IsArchived { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<AssetHistory> History { get; set; } = [];
    public ICollection<CustomFieldValue> CustomFieldValues { get; set; } = [];
}
