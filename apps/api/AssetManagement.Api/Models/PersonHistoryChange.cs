namespace AssetManagement.Api.Models;

public class PersonHistoryChange
{
    public Guid Id { get; set; }

    public Guid PersonHistoryId { get; set; }
    public PersonHistory PersonHistory { get; set; } = null!;

    public string FieldName { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
}
