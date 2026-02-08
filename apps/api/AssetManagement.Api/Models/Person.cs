namespace AssetManagement.Api.Models;

public class Person
{
    public Guid Id { get; set; }
    public required string FullName { get; set; }
    public string? Email { get; set; }
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public Guid? LocationId { get; set; }
    public Location? Location { get; set; }
    public bool IsArchived { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Asset> AssignedAssets { get; set; } = [];
    public List<PersonHistory> History { get; set; } = [];
}
