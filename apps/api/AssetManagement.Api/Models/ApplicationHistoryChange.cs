namespace AssetManagement.Api.Models;

public class ApplicationHistoryChange
{
    public Guid Id { get; set; }

    public Guid ApplicationHistoryId { get; set; }
    public ApplicationHistory ApplicationHistory { get; set; } = null!;

    public string FieldName { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
}
