namespace AssetManagement.Api.Services;

public record AuditChange(string FieldName, string? OldValue, string? NewValue);

public record AuditEntry(
    string Action,
    string EntityType,
    string EntityId,
    string? EntityName = null,
    string? Details = null,
    Guid? ActorId = null,
    string ActorName = "System",
    List<AuditChange>? Changes = null
);

public interface IAuditService
{
    Task LogAsync(AuditEntry entry);
}
