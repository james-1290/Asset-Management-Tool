namespace AssetManagement.Api.Models;

public class SavedView
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public required string EntityType { get; set; }
    public required string Name { get; set; }
    public bool IsDefault { get; set; }
    public required string Configuration { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
