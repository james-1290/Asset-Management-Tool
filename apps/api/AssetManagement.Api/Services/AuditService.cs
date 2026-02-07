using AssetManagement.Api.Data;
using AssetManagement.Api.Models;
using AssetManagement.Api.Models.Enums;

namespace AssetManagement.Api.Services;

public class AuditService(AppDbContext db) : IAuditService
{
    public async Task LogAsync(AuditEntry entry)
    {
        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid(),
            ActorId = entry.ActorId,
            ActorName = entry.ActorName,
            Action = entry.Action,
            EntityType = entry.EntityType,
            EntityId = entry.EntityId,
            Source = AuditSource.API,
            Details = entry.Details,
        };

        db.AuditLogs.Add(auditLog);

        if (entry.EntityType == "Asset" && Guid.TryParse(entry.EntityId, out var assetId))
        {
            var eventType = entry.Action switch
            {
                "Created" => AssetHistoryEventType.Created,
                "Updated" => AssetHistoryEventType.Edited,
                "Archived" => AssetHistoryEventType.Archived,
                _ => (AssetHistoryEventType?)null,
            };

            if (eventType is not null)
            {
                var history = new AssetHistory
                {
                    Id = Guid.NewGuid(),
                    AssetId = assetId,
                    EventType = eventType.Value,
                    PerformedByUserId = entry.ActorId,
                    Details = entry.Details,
                };

                if (entry.Changes is { Count: > 0 })
                {
                    foreach (var change in entry.Changes)
                    {
                        history.Changes.Add(new AssetHistoryChange
                        {
                            Id = Guid.NewGuid(),
                            FieldName = change.FieldName,
                            OldValue = change.OldValue,
                            NewValue = change.NewValue,
                        });
                    }
                }

                db.AssetHistory.Add(history);
            }
        }

        await db.SaveChangesAsync();
    }
}
