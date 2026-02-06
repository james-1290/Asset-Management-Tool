namespace AssetManagement.Api.Models;

public class AssetType
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public bool IsArchived { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Asset> Assets { get; set; } = [];
    public ICollection<CustomFieldDefinition> CustomFieldDefinitions { get; set; } = [];
}
