namespace AssetManagement.Api.Models;

public class ApplicationType
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public bool IsArchived { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Application> Applications { get; set; } = [];
    public ICollection<CustomFieldDefinition> CustomFieldDefinitions { get; set; } = [];
}
