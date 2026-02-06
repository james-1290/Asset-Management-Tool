namespace AssetManagement.Api.Services;

public record AuditEntry(
    string Action,
    string EntityType,
    string EntityId,
    string? Details = null,
    Guid? ActorId = null,
    string ActorName = "System"
);

public interface IAuditService
{
    Task LogAsync(AuditEntry entry);
}
