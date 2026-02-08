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
            EntityName = entry.EntityName,
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
                "CheckedOut" => AssetHistoryEventType.CheckedOut,
                "CheckedIn" => AssetHistoryEventType.CheckedIn,
                "Retired" => AssetHistoryEventType.Retired,
                "Sold" => AssetHistoryEventType.Sold,
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

        if (entry.EntityType == "Certificate" && Guid.TryParse(entry.EntityId, out var certificateId))
        {
            var certEventType = entry.Action switch
            {
                "Created" => CertificateHistoryEventType.Created,
                "Updated" => CertificateHistoryEventType.Edited,
                "Archived" => CertificateHistoryEventType.Archived,
                "Renewed" => CertificateHistoryEventType.Renewed,
                "Revoked" => CertificateHistoryEventType.Revoked,
                _ => (CertificateHistoryEventType?)null,
            };

            if (certEventType is not null)
            {
                var certHistory = new CertificateHistory
                {
                    Id = Guid.NewGuid(),
                    CertificateId = certificateId,
                    EventType = certEventType.Value,
                    PerformedByUserId = entry.ActorId,
                    Details = entry.Details,
                };

                if (entry.Changes is { Count: > 0 })
                {
                    foreach (var change in entry.Changes)
                    {
                        certHistory.Changes.Add(new CertificateHistoryChange
                        {
                            Id = Guid.NewGuid(),
                            FieldName = change.FieldName,
                            OldValue = change.OldValue,
                            NewValue = change.NewValue,
                        });
                    }
                }

                db.CertificateHistory.Add(certHistory);
            }
        }

        if (entry.EntityType == "Application" && Guid.TryParse(entry.EntityId, out var applicationId))
        {
            var appEventType = entry.Action switch
            {
                "Created" => ApplicationHistoryEventType.Created,
                "Updated" => ApplicationHistoryEventType.Edited,
                "Archived" => ApplicationHistoryEventType.Archived,
                "Renewed" => ApplicationHistoryEventType.Renewed,
                "Suspended" => ApplicationHistoryEventType.Suspended,
                _ => (ApplicationHistoryEventType?)null,
            };

            if (appEventType is not null)
            {
                var appHistory = new ApplicationHistory
                {
                    Id = Guid.NewGuid(),
                    ApplicationId = applicationId,
                    EventType = appEventType.Value,
                    PerformedByUserId = entry.ActorId,
                    Details = entry.Details,
                };

                if (entry.Changes is { Count: > 0 })
                {
                    foreach (var change in entry.Changes)
                    {
                        appHistory.Changes.Add(new ApplicationHistoryChange
                        {
                            Id = Guid.NewGuid(),
                            FieldName = change.FieldName,
                            OldValue = change.OldValue,
                            NewValue = change.NewValue,
                        });
                    }
                }

                db.ApplicationHistory.Add(appHistory);
            }
        }

        await db.SaveChangesAsync();
    }
}
