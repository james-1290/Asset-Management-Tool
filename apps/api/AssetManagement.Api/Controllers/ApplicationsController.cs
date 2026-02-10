using System.Globalization;
using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using AssetManagement.Api.Models;
using AssetManagement.Api.Models.Enums;
using AssetManagement.Api.Services;
using CsvHelper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public class ApplicationsController(AppDbContext db, IAuditService audit, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResponse<ApplicationDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? includeStatuses = null,
        [FromQuery] string sortBy = "name",
        [FromQuery] string sortDir = "asc",
        [FromQuery] Guid? typeId = null)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var (query, error) = BuildFilteredQuery(search, status, includeStatuses, typeId);
        if (error is not null) return error;

        var totalCount = await query!.CountAsync();

        query = ApplySorting(query!, sortBy, sortDir);

        var applications = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var appIds = applications.Select(a => a.Id).ToList();
        var cfvs = await db.CustomFieldValues
            .Where(v => appIds.Contains(v.EntityId))
            .Include(v => v.CustomFieldDefinition)
            .ToListAsync();
        var cfvsByEntity = cfvs.GroupBy(v => v.EntityId).ToDictionary(g => g.Key, g => g.ToList());

        var result = new PagedResponse<ApplicationDto>(
            applications.Select(a => ToDto(a, cfvsByEntity.GetValueOrDefault(a.Id))).ToList(),
            page,
            pageSize,
            totalCount);

        return Ok(result);
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? includeStatuses = null,
        [FromQuery] string sortBy = "name",
        [FromQuery] string sortDir = "asc",
        [FromQuery] Guid? typeId = null,
        [FromQuery] string? ids = null)
    {
        List<Application> applications;
        if (!string.IsNullOrEmpty(ids))
        {
            var idList = ids.Split(',').Select(id => Guid.TryParse(id.Trim(), out var g) ? g : (Guid?)null).Where(g => g.HasValue).Select(g => g!.Value).ToList();
            applications = await db.Applications.Include(a => a.ApplicationType).Where(a => !a.IsArchived && idList.Contains(a.Id)).ToListAsync();
        }
        else
        {
            var (query, error) = BuildFilteredQuery(search, status, includeStatuses, typeId);
            if (error is not null) return error;
            query = ApplySorting(query!, sortBy, sortDir);
            applications = await query.ToListAsync();
        }

        var ms = new MemoryStream();
        await using var writer = new StreamWriter(ms, leaveOpen: true);
        await using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        csv.WriteField("Name");
        csv.WriteField("ApplicationType");
        csv.WriteField("Status");
        csv.WriteField("Publisher");
        csv.WriteField("Version");
        csv.WriteField("LicenceKey");
        csv.WriteField("LicenceType");
        csv.WriteField("MaxSeats");
        csv.WriteField("UsedSeats");
        csv.WriteField("ExpiryDate");
        csv.WriteField("PurchaseCost");
        csv.WriteField("AutoRenewal");
        csv.WriteField("Notes");
        csv.WriteField("CreatedAt");
        csv.WriteField("UpdatedAt");
        await csv.NextRecordAsync();

        foreach (var a in applications)
        {
            csv.WriteField(a.Name);
            csv.WriteField(a.ApplicationType?.Name);
            csv.WriteField(a.Status.ToString());
            csv.WriteField(a.Publisher);
            csv.WriteField(a.Version);
            csv.WriteField(a.LicenceKey);
            csv.WriteField(a.LicenceType?.ToString());
            csv.WriteField(a.MaxSeats);
            csv.WriteField(a.UsedSeats);
            csv.WriteField(a.ExpiryDate?.ToString("yyyy-MM-dd"));
            csv.WriteField(a.PurchaseCost?.ToString("F2"));
            csv.WriteField(a.AutoRenewal);
            csv.WriteField(a.Notes);
            csv.WriteField(a.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"));
            csv.WriteField(a.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss"));
            await csv.NextRecordAsync();
        }

        await writer.FlushAsync();
        ms.Position = 0;

        return File(ms, "text/csv", "applications-export.csv");
    }

    private (IQueryable<Application>? query, ActionResult? error) BuildFilteredQuery(
        string? search, string? status, string? includeStatuses, Guid? typeId)
    {
        var query = db.Applications
            .Where(a => !a.IsArchived)
            .Include(a => a.ApplicationType)
            .Include(a => a.Asset)
            .Include(a => a.Person)
            .Include(a => a.Location)
            .AsQueryable();

        if (typeId.HasValue)
            query = query.Where(a => a.ApplicationTypeId == typeId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(a =>
                EF.Functions.ILike(a.Name, $"%{search}%") ||
                (a.Publisher != null && EF.Functions.ILike(a.Publisher, $"%{search}%")));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<ApplicationStatus>(status, out var parsedStatus))
                return (null, BadRequest(new { error = $"Invalid status: {status}" }));
            query = query.Where(a => a.Status == parsedStatus);
        }
        else
        {
            var hiddenStatuses = new HashSet<ApplicationStatus> { ApplicationStatus.Inactive };
            if (!string.IsNullOrWhiteSpace(includeStatuses))
            {
                foreach (var s in includeStatuses.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                {
                    if (Enum.TryParse<ApplicationStatus>(s, out var parsed))
                        hiddenStatuses.Remove(parsed);
                }
            }
            if (hiddenStatuses.Count > 0)
                query = query.Where(a => !hiddenStatuses.Contains(a.Status));
        }

        return (query, null);
    }

    private static IQueryable<Application> ApplySorting(IQueryable<Application> query, string sortBy, string sortDir)
    {
        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        return sortBy.ToLowerInvariant() switch
        {
            "publisher" => desc ? query.OrderByDescending(a => a.Publisher) : query.OrderBy(a => a.Publisher),
            "licencetype" => desc ? query.OrderByDescending(a => a.LicenceType) : query.OrderBy(a => a.LicenceType),
            "expirydate" => desc ? query.OrderByDescending(a => a.ExpiryDate) : query.OrderBy(a => a.ExpiryDate),
            "status" => desc ? query.OrderByDescending(a => a.Status) : query.OrderBy(a => a.Status),
            "applicationtypename" => desc ? query.OrderByDescending(a => a.ApplicationType.Name) : query.OrderBy(a => a.ApplicationType.Name),
            "createdat" => desc ? query.OrderByDescending(a => a.CreatedAt) : query.OrderBy(a => a.CreatedAt),
            _ => desc ? query.OrderByDescending(a => a.Name) : query.OrderBy(a => a.Name),
        };
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApplicationDto>> GetById(Guid id)
    {
        var app = await db.Applications
            .Include(a => a.ApplicationType)
            .Include(a => a.Asset)
            .Include(a => a.Person)
            .Include(a => a.Location)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (app is null) return NotFound();

        var cfvs = await LoadCustomFieldValues(app.Id);

        return Ok(ToDto(app, cfvs));
    }

    [HttpPost]
    public async Task<ActionResult<ApplicationDto>> Create(CreateApplicationRequest request)
    {
        var appTypeExists = await db.ApplicationTypes.AnyAsync(t => t.Id == request.ApplicationTypeId && !t.IsArchived);
        if (!appTypeExists)
            return BadRequest(new { error = "Application type not found." });

        if (request.AssetId is not null)
        {
            var assetExists = await db.Assets.AnyAsync(a => a.Id == request.AssetId && !a.IsArchived);
            if (!assetExists)
                return BadRequest(new { error = "Asset not found." });
        }

        if (request.PersonId is not null)
        {
            var personExists = await db.People.AnyAsync(p => p.Id == request.PersonId && !p.IsArchived);
            if (!personExists)
                return BadRequest(new { error = "Person not found." });
        }

        if (request.LocationId is not null)
        {
            var locationExists = await db.Locations.AnyAsync(l => l.Id == request.LocationId && !l.IsArchived);
            if (!locationExists)
                return BadRequest(new { error = "Location not found." });
        }

        var status = ApplicationStatus.Active;
        if (!string.IsNullOrEmpty(request.Status))
        {
            if (!Enum.TryParse<ApplicationStatus>(request.Status, out status))
                return BadRequest(new { error = $"Invalid status: {request.Status}" });
        }

        LicenceType? licenceType = null;
        if (!string.IsNullOrEmpty(request.LicenceType))
        {
            if (!Enum.TryParse<LicenceType>(request.LicenceType, out var lt))
                return BadRequest(new { error = $"Invalid licence type: {request.LicenceType}" });
            licenceType = lt;
        }

        var app = new Application
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            ApplicationTypeId = request.ApplicationTypeId,
            Publisher = request.Publisher,
            Version = request.Version,
            LicenceKey = request.LicenceKey,
            LicenceType = licenceType,
            MaxSeats = request.MaxSeats,
            UsedSeats = request.UsedSeats,
            PurchaseDate = request.PurchaseDate,
            ExpiryDate = request.ExpiryDate,
            PurchaseCost = request.PurchaseCost,
            AutoRenewal = request.AutoRenewal,
            Status = status,
            Notes = request.Notes,
            AssetId = request.AssetId,
            PersonId = request.PersonId,
            LocationId = request.LocationId,
        };

        db.Applications.Add(app);

        if (request.CustomFieldValues is { Count: > 0 })
        {
            var validDefIds = await db.CustomFieldDefinitions
                .Where(d => d.ApplicationTypeId == request.ApplicationTypeId && !d.IsArchived)
                .Select(d => d.Id)
                .ToListAsync();
            var validDefIdSet = validDefIds.ToHashSet();

            foreach (var cfv in request.CustomFieldValues)
            {
                if (!validDefIdSet.Contains(cfv.FieldDefinitionId))
                    return BadRequest(new { error = $"Custom field definition {cfv.FieldDefinitionId} not found for this application type." });

                db.CustomFieldValues.Add(new CustomFieldValue
                {
                    Id = Guid.NewGuid(),
                    CustomFieldDefinitionId = cfv.FieldDefinitionId,
                    EntityId = app.Id,
                    Value = cfv.Value
                });
            }
        }

        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Created",
            EntityType: "Application",
            EntityId: app.Id.ToString(),
            EntityName: app.Name,
            Details: $"Created application \"{app.Name}\"",
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName));

        await db.Entry(app).Reference(a => a.ApplicationType).LoadAsync();
        if (app.AssetId is not null)
            await db.Entry(app).Reference(a => a.Asset).LoadAsync();
        if (app.PersonId is not null)
            await db.Entry(app).Reference(a => a.Person).LoadAsync();
        if (app.LocationId is not null)
            await db.Entry(app).Reference(a => a.Location).LoadAsync();

        var cfvsLoaded = await LoadCustomFieldValues(app.Id);

        return CreatedAtAction(nameof(GetById), new { id = app.Id }, ToDto(app, cfvsLoaded));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApplicationDto>> Update(Guid id, UpdateApplicationRequest request)
    {
        var app = await db.Applications
            .Include(a => a.ApplicationType)
            .Include(a => a.Asset)
            .Include(a => a.Person)
            .Include(a => a.Location)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (app is null) return NotFound();

        var existingCfvs = await LoadCustomFieldValues(app.Id);

        var appTypeExists = await db.ApplicationTypes.AnyAsync(t => t.Id == request.ApplicationTypeId && !t.IsArchived);
        if (!appTypeExists)
            return BadRequest(new { error = "Application type not found." });

        if (request.AssetId is not null)
        {
            var assetExists = await db.Assets.AnyAsync(a => a.Id == request.AssetId && !a.IsArchived);
            if (!assetExists)
                return BadRequest(new { error = "Asset not found." });
        }

        if (request.PersonId is not null)
        {
            var personExists = await db.People.AnyAsync(p => p.Id == request.PersonId && !p.IsArchived);
            if (!personExists)
                return BadRequest(new { error = "Person not found." });
        }

        if (request.LocationId is not null)
        {
            var locationExists = await db.Locations.AnyAsync(l => l.Id == request.LocationId && !l.IsArchived);
            if (!locationExists)
                return BadRequest(new { error = "Location not found." });
        }

        ApplicationStatus? newStatus = null;
        if (!string.IsNullOrEmpty(request.Status))
        {
            if (!Enum.TryParse<ApplicationStatus>(request.Status, out var parsedStatus))
                return BadRequest(new { error = $"Invalid status: {request.Status}" });
            newStatus = parsedStatus;
        }

        LicenceType? newLicenceType = null;
        bool licenceTypeChanged = false;
        if (request.LicenceType is not null)
        {
            if (request.LicenceType == "")
            {
                if (app.LicenceType is not null) licenceTypeChanged = true;
            }
            else
            {
                if (!Enum.TryParse<LicenceType>(request.LicenceType, out var lt))
                    return BadRequest(new { error = $"Invalid licence type: {request.LicenceType}" });
                newLicenceType = lt;
                if (newLicenceType != app.LicenceType) licenceTypeChanged = true;
            }
        }

        var changes = new List<AuditChange>();

        Track(changes, "Name", app.Name, request.Name);
        Track(changes, "Publisher", app.Publisher, request.Publisher);
        Track(changes, "Version", app.Version, request.Version);
        Track(changes, "LicenceKey", app.LicenceKey, request.LicenceKey);
        Track(changes, "Notes", app.Notes, request.Notes);

        if (newStatus is not null && newStatus != app.Status)
            changes.Add(new AuditChange("Status", app.Status.ToString(), newStatus.ToString()!));

        if (licenceTypeChanged)
            changes.Add(new AuditChange("Licence Type", app.LicenceType?.ToString(), newLicenceType?.ToString()));

        if (request.ApplicationTypeId != app.ApplicationTypeId)
        {
            var newTypeName = await db.ApplicationTypes.Where(t => t.Id == request.ApplicationTypeId).Select(t => t.Name).FirstAsync();
            changes.Add(new AuditChange("Type", app.ApplicationType.Name, newTypeName));
        }

        TrackDate(changes, "Purchase Date", app.PurchaseDate, request.PurchaseDate);
        TrackDate(changes, "Expiry Date", app.ExpiryDate, request.ExpiryDate);
        TrackBool(changes, "Auto Renewal", app.AutoRenewal, request.AutoRenewal);
        TrackInt(changes, "Max Seats", app.MaxSeats, request.MaxSeats);
        TrackInt(changes, "Used Seats", app.UsedSeats, request.UsedSeats);
        TrackDecimal(changes, "Purchase Cost", app.PurchaseCost, request.PurchaseCost);

        if (request.AssetId != app.AssetId)
        {
            var oldName = app.Asset?.Name;
            string? newName = null;
            if (request.AssetId is not null)
                newName = await db.Assets.Where(a => a.Id == request.AssetId).Select(a => a.Name).FirstAsync();
            changes.Add(new AuditChange("Asset", oldName, newName));
        }

        if (request.PersonId != app.PersonId)
        {
            var oldName = app.Person?.FullName;
            string? newName = null;
            if (request.PersonId is not null)
                newName = await db.People.Where(p => p.Id == request.PersonId).Select(p => p.FullName).FirstAsync();
            changes.Add(new AuditChange("Person", oldName, newName));
        }

        if (request.LocationId != app.LocationId)
        {
            var oldName = app.Location?.Name;
            string? newName = null;
            if (request.LocationId is not null)
                newName = await db.Locations.Where(l => l.Id == request.LocationId).Select(l => l.Name).FirstAsync();
            changes.Add(new AuditChange("Location", oldName, newName));
        }

        // Apply changes
        app.Name = request.Name;
        app.ApplicationTypeId = request.ApplicationTypeId;
        app.Publisher = request.Publisher;
        app.Version = request.Version;
        app.LicenceKey = request.LicenceKey;
        if (licenceTypeChanged) app.LicenceType = newLicenceType;
        app.MaxSeats = request.MaxSeats;
        app.UsedSeats = request.UsedSeats;
        app.PurchaseDate = request.PurchaseDate;
        app.ExpiryDate = request.ExpiryDate;
        app.PurchaseCost = request.PurchaseCost;
        app.AutoRenewal = request.AutoRenewal;
        app.Notes = request.Notes;
        app.AssetId = request.AssetId;
        app.PersonId = request.PersonId;
        app.LocationId = request.LocationId;
        if (newStatus is not null) app.Status = newStatus.Value;
        app.UpdatedAt = DateTime.UtcNow;

        // Upsert custom field values
        if (request.CustomFieldValues is not null)
        {
            var existingValues = existingCfvs.ToDictionary(v => v.CustomFieldDefinitionId);

            var validDefIds = await db.CustomFieldDefinitions
                .Where(d => d.ApplicationTypeId == request.ApplicationTypeId && !d.IsArchived)
                .Select(d => d.Id)
                .ToListAsync();
            var validDefIdSet = validDefIds.ToHashSet();

            foreach (var cfv in request.CustomFieldValues)
            {
                if (!validDefIdSet.Contains(cfv.FieldDefinitionId))
                    continue;

                if (existingValues.TryGetValue(cfv.FieldDefinitionId, out var existing))
                {
                    if (existing.Value != cfv.Value)
                    {
                        var defName = existing.CustomFieldDefinition.Name;
                        changes.Add(new AuditChange($"Custom: {defName}", existing.Value, cfv.Value));
                        existing.Value = cfv.Value;
                        existing.UpdatedAt = DateTime.UtcNow;
                    }
                }
                else
                {
                    db.CustomFieldValues.Add(new CustomFieldValue
                    {
                        Id = Guid.NewGuid(),
                        CustomFieldDefinitionId = cfv.FieldDefinitionId,
                        EntityId = app.Id,
                        Value = cfv.Value
                    });

                    var defName = await db.CustomFieldDefinitions
                        .Where(d => d.Id == cfv.FieldDefinitionId)
                        .Select(d => d.Name)
                        .FirstAsync();
                    if (!string.IsNullOrEmpty(cfv.Value))
                        changes.Add(new AuditChange($"Custom: {defName}", null, cfv.Value));
                }
            }
        }

        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Updated",
            EntityType: "Application",
            EntityId: app.Id.ToString(),
            EntityName: app.Name,
            Details: $"Updated application \"{app.Name}\"",
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName,
            Changes: changes.Count > 0 ? changes : null));

        await db.Entry(app).Reference(a => a.ApplicationType).LoadAsync();
        if (app.AssetId is not null)
            await db.Entry(app).Reference(a => a.Asset).LoadAsync();
        if (app.PersonId is not null)
            await db.Entry(app).Reference(a => a.Person).LoadAsync();
        if (app.LocationId is not null)
            await db.Entry(app).Reference(a => a.Location).LoadAsync();

        var updatedCfvs = await LoadCustomFieldValues(app.Id);

        return Ok(ToDto(app, updatedCfvs));
    }

    [HttpGet("{id:guid}/history")]
    public async Task<ActionResult<List<ApplicationHistoryDto>>> GetHistory(Guid id, [FromQuery] int? limit = null)
    {
        var appExists = await db.Applications.AnyAsync(a => a.Id == id);
        if (!appExists) return NotFound();

        var query = db.ApplicationHistory
            .Where(h => h.ApplicationId == id)
            .Include(h => h.PerformedByUser)
            .Include(h => h.Changes)
            .OrderByDescending(h => h.Timestamp);

        var historyQuery = limit.HasValue ? query.Take(limit.Value) : query;

        var history = await historyQuery
            .Select(h => new ApplicationHistoryDto(
                h.Id,
                h.EventType.ToString(),
                h.Details,
                h.Timestamp,
                h.PerformedByUser != null ? h.PerformedByUser.DisplayName : null,
                h.Changes.Select(c => new ApplicationHistoryChangeDto(
                    c.FieldName, c.OldValue, c.NewValue)).ToList()))
            .ToListAsync();

        return Ok(history);
    }

    [HttpPost("bulk-archive")]
    public async Task<ActionResult<BulkActionResponse>> BulkArchive(BulkArchiveRequest request)
    {
        int succeeded = 0, failed = 0;
        foreach (var id in request.Ids)
        {
            var app = await db.Applications.FindAsync(id);
            if (app is null || app.IsArchived) { failed++; continue; }

            app.IsArchived = true;
            app.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            await audit.LogAsync(new AuditEntry(
                Action: "Archived",
                EntityType: "Application",
                EntityId: app.Id.ToString(),
                EntityName: app.Name,
                Details: $"Bulk archived application \"{app.Name}\"",
                ActorId: currentUser.UserId,
                ActorName: currentUser.UserName));
            succeeded++;
        }
        return Ok(new BulkActionResponse(succeeded, failed));
    }

    [HttpPost("bulk-status")]
    public async Task<ActionResult<BulkActionResponse>> BulkStatus(BulkStatusRequest request)
    {
        if (!Enum.TryParse<ApplicationStatus>(request.Status, out var newStatus))
            return BadRequest(new { error = $"Invalid status: {request.Status}" });

        int succeeded = 0, failed = 0;
        foreach (var id in request.Ids)
        {
            var app = await db.Applications.FindAsync(id);
            if (app is null || app.IsArchived) { failed++; continue; }

            var oldStatus = app.Status;
            app.Status = newStatus;
            app.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            await audit.LogAsync(new AuditEntry(
                Action: "StatusChanged",
                EntityType: "Application",
                EntityId: app.Id.ToString(),
                EntityName: app.Name,
                Details: $"Bulk status change \"{app.Name}\": {oldStatus} → {newStatus}",
                ActorId: currentUser.UserId,
                ActorName: currentUser.UserName,
                Changes: [new AuditChange("Status", oldStatus.ToString(), newStatus.ToString())]));
            succeeded++;
        }
        return Ok(new BulkActionResponse(succeeded, failed));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Archive(Guid id)
    {
        var app = await db.Applications.FindAsync(id);
        if (app is null) return NotFound();

        app.IsArchived = true;
        app.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Archived",
            EntityType: "Application",
            EntityId: app.Id.ToString(),
            EntityName: app.Name,
            Details: $"Archived application \"{app.Name}\"",
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName));

        return NoContent();
    }

    private async Task<List<CustomFieldValue>> LoadCustomFieldValues(Guid appId)
    {
        return await db.CustomFieldValues
            .Where(v => v.EntityId == appId)
            .Include(v => v.CustomFieldDefinition)
            .ToListAsync();
    }

    private static ApplicationDto ToDto(Application a, List<CustomFieldValue>? cfvs = null) => new(
        a.Id, a.Name,
        a.ApplicationTypeId, a.ApplicationType.Name,
        a.Publisher, a.Version, a.LicenceKey,
        a.LicenceType?.ToString(),
        a.MaxSeats, a.UsedSeats,
        a.PurchaseDate, a.ExpiryDate,
        a.PurchaseCost, a.AutoRenewal,
        a.Status.ToString(),
        a.Notes,
        a.AssetId, a.Asset?.Name,
        a.PersonId, a.Person?.FullName,
        a.LocationId, a.Location?.Name,
        a.IsArchived, a.CreatedAt, a.UpdatedAt,
        (cfvs ?? [])
            .Where(v => !v.CustomFieldDefinition.IsArchived)
            .Select(v => new CustomFieldValueDto(
                v.CustomFieldDefinitionId,
                v.CustomFieldDefinition.Name,
                v.CustomFieldDefinition.FieldType.ToString(),
                v.Value))
            .ToList());

    private static void Track(List<AuditChange> changes, string field, string? oldVal, string? newVal)
    {
        if (oldVal != newVal)
            changes.Add(new AuditChange(field, oldVal, newVal));
    }

    private static void TrackDate(List<AuditChange> changes, string field, DateTime? oldVal, DateTime? newVal)
    {
        if (oldVal?.Date != newVal?.Date)
            changes.Add(new AuditChange(field, oldVal?.ToString("yyyy-MM-dd"), newVal?.ToString("yyyy-MM-dd")));
    }

    private static void TrackBool(List<AuditChange> changes, string field, bool oldVal, bool newVal)
    {
        if (oldVal != newVal)
            changes.Add(new AuditChange(field, oldVal.ToString(), newVal.ToString()));
    }

    private static void TrackInt(List<AuditChange> changes, string field, int? oldVal, int? newVal)
    {
        if (oldVal != newVal)
            changes.Add(new AuditChange(field, oldVal?.ToString(), newVal?.ToString()));
    }

    private static void TrackDecimal(List<AuditChange> changes, string field, decimal? oldVal, decimal? newVal)
    {
        if (oldVal != newVal)
            changes.Add(new AuditChange(field, oldVal?.ToString("F2"), newVal?.ToString("F2")));
    }
}
