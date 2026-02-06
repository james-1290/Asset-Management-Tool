namespace AssetManagement.Api.Models;

public class CustomFieldValue
{
    public Guid Id { get; set; }

    public Guid CustomFieldDefinitionId { get; set; }
    public CustomFieldDefinition CustomFieldDefinition { get; set; } = null!;

    public Guid EntityId { get; set; }
    public string? Value { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
