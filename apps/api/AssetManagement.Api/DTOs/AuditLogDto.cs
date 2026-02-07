namespace AssetManagement.Api.DTOs;

public record AuditLogDto(
    Guid Id,
    string ActorName,
    string Action,
    string EntityType,
    string EntityId,
    string? EntityName,
    string Source,
    string? Details,
    DateTime Timestamp
);
