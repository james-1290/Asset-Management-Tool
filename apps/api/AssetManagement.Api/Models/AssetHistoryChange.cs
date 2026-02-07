namespace AssetManagement.Api.Models;

public class AssetHistoryChange
{
    public Guid Id { get; set; }

    public Guid AssetHistoryId { get; set; }
    public AssetHistory AssetHistory { get; set; } = null!;

    public string FieldName { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
}
