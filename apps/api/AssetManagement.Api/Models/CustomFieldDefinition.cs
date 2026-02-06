using AssetManagement.Api.Models.Enums;
using EntityTypeEnum = AssetManagement.Api.Models.Enums.EntityType;

namespace AssetManagement.Api.Models;

public class CustomFieldDefinition
{
    public Guid Id { get; set; }
    public EntityTypeEnum EntityType { get; set; }

    public Guid? AssetTypeId { get; set; }
    public AssetType? AssetType { get; set; }

    public required string Name { get; set; }
    public CustomFieldType FieldType { get; set; }
    public string? Options { get; set; }
    public bool IsRequired { get; set; }
    public int SortOrder { get; set; }
    public bool IsArchived { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CustomFieldValue> Values { get; set; } = [];
}
