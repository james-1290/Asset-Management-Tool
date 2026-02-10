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
public class AssetsController(AppDbContext db, IAuditService audit, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResponse<AssetDto>>> GetAll(
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

        var assets = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = new PagedResponse<AssetDto>(
            assets.Select(ToDto).ToList(),
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
        List<Asset> assets;
        if (!string.IsNullOrEmpty(ids))
        {
            var idList = ids.Split(',').Select(id => Guid.TryParse(id.Trim(), out var g) ? g : (Guid?)null).Where(g => g.HasValue).Select(g => g!.Value).ToList();
            assets = await db.Assets.Include(a => a.AssetType).Include(a => a.Location).Include(a => a.AssignedPerson).Where(a => !a.IsArchived && idList.Contains(a.Id)).ToListAsync();
        }
        else
        {
            var (query, error) = BuildFilteredQuery(search, status, includeStatuses, typeId);
            if (error is not null) return error;
            query = ApplySorting(query!, sortBy, sortDir);
            assets = await query.ToListAsync();
        }

        var ms = new MemoryStream();
        await using var writer = new StreamWriter(ms, leaveOpen: true);
        await using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        csv.WriteField("AssetTag");
        csv.WriteField("Name");
        csv.WriteField("Status");
        csv.WriteField("AssetType");
        csv.WriteField("Location");
        csv.WriteField("AssignedTo");
        csv.WriteField("SerialNumber");
        csv.WriteField("PurchaseDate");
        csv.WriteField("PurchaseCost");
        csv.WriteField("WarrantyExpiryDate");
        csv.WriteField("Notes");
        csv.WriteField("CreatedAt");
        csv.WriteField("UpdatedAt");
        await csv.NextRecordAsync();

        foreach (var a in assets)
        {
            csv.WriteField(a.AssetTag);
            csv.WriteField(a.Name);
            csv.WriteField(a.Status.ToString());
            csv.WriteField(a.AssetType?.Name);
            csv.WriteField(a.Location?.Name);
            csv.WriteField(a.AssignedPerson?.FullName);
            csv.WriteField(a.SerialNumber);
            csv.WriteField(a.PurchaseDate?.ToString("yyyy-MM-dd"));
            csv.WriteField(a.PurchaseCost?.ToString("F2"));
            csv.WriteField(a.WarrantyExpiryDate?.ToString("yyyy-MM-dd"));
            csv.WriteField(a.Notes);
            csv.WriteField(a.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"));
            csv.WriteField(a.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss"));
            await csv.NextRecordAsync();
        }

        await writer.FlushAsync();
        ms.Position = 0;

        return File(ms, "text/csv", "assets-export.csv");
    }

    private (IQueryable<Asset>? query, ActionResult? error) BuildFilteredQuery(
        string? search, string? status, string? includeStatuses, Guid? typeId)
    {
        var query = db.Assets
            .Where(a => !a.IsArchived)
            .Include(a => a.AssetType)
            .Include(a => a.Location)
            .Include(a => a.AssignedPerson)
            .Include(a => a.CustomFieldValues)
                .ThenInclude(v => v.CustomFieldDefinition)
            .AsQueryable();

        if (typeId.HasValue)
            query = query.Where(a => a.AssetTypeId == typeId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(a =>
                EF.Functions.ILike(a.Name, $"%{search}%") ||
                EF.Functions.ILike(a.AssetTag, $"%{search}%"));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<AssetStatus>(status, out var parsedStatus))
                return (null, BadRequest(new { error = $"Invalid status: {status}" }));
            query = query.Where(a => a.Status == parsedStatus);
        }
        else
        {
            var hiddenStatuses = new HashSet<AssetStatus> { AssetStatus.Retired, AssetStatus.Sold };
            if (!string.IsNullOrWhiteSpace(includeStatuses))
            {
                foreach (var s in includeStatuses.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                {
                    if (Enum.TryParse<AssetStatus>(s, out var parsed))
                        hiddenStatuses.Remove(parsed);
                }
            }
            if (hiddenStatuses.Count > 0)
                query = query.Where(a => !hiddenStatuses.Contains(a.Status));
        }

        return (query, null);
    }

    private static IQueryable<Asset> ApplySorting(IQueryable<Asset> query, string sortBy, string sortDir)
    {
        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        return sortBy.ToLowerInvariant() switch
        {
            "assettag" => desc ? query.OrderByDescending(a => a.AssetTag) : query.OrderBy(a => a.AssetTag),
            "status" => desc ? query.OrderByDescending(a => a.Status) : query.OrderBy(a => a.Status),
            "assettypename" => desc ? query.OrderByDescending(a => a.AssetType.Name) : query.OrderBy(a => a.AssetType.Name),
            "locationname" => desc ? query.OrderByDescending(a => a.Location!.Name) : query.OrderBy(a => a.Location!.Name),
            "purchasedate" => desc ? query.OrderByDescending(a => a.PurchaseDate) : query.OrderBy(a => a.PurchaseDate),
            "purchasecost" => desc ? query.OrderByDescending(a => a.PurchaseCost) : query.OrderBy(a => a.PurchaseCost),
            "warrantyexpirydate" => desc ? query.OrderByDescending(a => a.WarrantyExpiryDate) : query.OrderBy(a => a.WarrantyExpiryDate),
            "createdat" => desc ? query.OrderByDescending(a => a.CreatedAt) : query.OrderBy(a => a.CreatedAt),
            _ => desc ? query.OrderByDescending(a => a.Name) : query.OrderBy(a => a.Name),
        };
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AssetDto>> GetById(Guid id)
    {
        var asset = await db.Assets
            .Include(a => a.AssetType)
            .Include(a => a.Location)
            .Include(a => a.AssignedPerson)
            .Include(a => a.CustomFieldValues)
                .ThenInclude(v => v.CustomFieldDefinition)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (asset is null) return NotFound();

        return Ok(ToDto(asset));
    }

    [HttpPost]
    public async Task<ActionResult<AssetDto>> Create(CreateAssetRequest request)
    {
        // Validate AssetType exists
        var assetTypeExists = await db.AssetTypes.AnyAsync(t => t.Id == request.AssetTypeId && !t.IsArchived);
        if (!assetTypeExists)
            return BadRequest(new { error = "Asset type not found." });

        // Validate Location exists (if provided)
        if (request.LocationId is not null)
        {
            var locationExists = await db.Locations.AnyAsync(l => l.Id == request.LocationId && !l.IsArchived);
            if (!locationExists)
                return BadRequest(new { error = "Location not found." });
        }

        // Validate AssignedPerson exists (if provided)
        if (request.AssignedPersonId is not null)
        {
            var personExists = await db.People.AnyAsync(p => p.Id == request.AssignedPersonId && !p.IsArchived);
            if (!personExists)
                return BadRequest(new { error = "Assigned person not found." });
        }

        // Validate AssetTag unique
        var tagExists = await db.Assets.AnyAsync(a => a.AssetTag == request.AssetTag);
        if (tagExists)
            return Conflict(new { error = "An asset with this tag already exists." });

        // Parse status
        var status = AssetStatus.Available;
        if (!string.IsNullOrEmpty(request.Status))
        {
            if (!Enum.TryParse<AssetStatus>(request.Status, out status))
                return BadRequest(new { error = $"Invalid status: {request.Status}" });
        }

        var asset = new Asset
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            AssetTag = request.AssetTag,
            SerialNumber = request.SerialNumber,
            Status = status,
            AssetTypeId = request.AssetTypeId,
            LocationId = request.LocationId,
            AssignedPersonId = request.AssignedPersonId,
            PurchaseDate = request.PurchaseDate,
            PurchaseCost = request.PurchaseCost,
            WarrantyExpiryDate = request.WarrantyExpiryDate,
            Notes = request.Notes,
        };

        db.Assets.Add(asset);

        // Create custom field values
        if (request.CustomFieldValues is { Count: > 0 })
        {
            var validDefIds = await db.CustomFieldDefinitions
                .Where(d => d.AssetTypeId == request.AssetTypeId && !d.IsArchived)
                .Select(d => d.Id)
                .ToListAsync();
            var validDefIdSet = validDefIds.ToHashSet();

            foreach (var cfv in request.CustomFieldValues)
            {
                if (!validDefIdSet.Contains(cfv.FieldDefinitionId))
                    return BadRequest(new { error = $"Custom field definition {cfv.FieldDefinitionId} not found for this asset type." });

                db.CustomFieldValues.Add(new CustomFieldValue
                {
                    Id = Guid.NewGuid(),
                    CustomFieldDefinitionId = cfv.FieldDefinitionId,
                    EntityId = asset.Id,
                    Value = cfv.Value
                });
            }
        }

        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Created",
            EntityType: "Asset",
            EntityId: asset.Id.ToString(),
            EntityName: asset.Name,
            Details: $"Created asset \"{asset.Name}\" ({asset.AssetTag})",
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName));

        // Reload with navigation properties
        await db.Entry(asset).Reference(a => a.AssetType).LoadAsync();
        if (asset.LocationId is not null)
            await db.Entry(asset).Reference(a => a.Location).LoadAsync();
        if (asset.AssignedPersonId is not null)
            await db.Entry(asset).Reference(a => a.AssignedPerson).LoadAsync();
        await db.Entry(asset).Collection(a => a.CustomFieldValues).LoadAsync();
        foreach (var v in asset.CustomFieldValues)
            await db.Entry(v).Reference(v2 => v2.CustomFieldDefinition).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = asset.Id }, ToDto(asset));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AssetDto>> Update(Guid id, UpdateAssetRequest request)
    {
        var asset = await db.Assets
            .Include(a => a.AssetType)
            .Include(a => a.Location)
            .Include(a => a.AssignedPerson)
            .Include(a => a.CustomFieldValues)
                .ThenInclude(v => v.CustomFieldDefinition)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (asset is null) return NotFound();

        // Validate AssetType exists
        var assetTypeExists = await db.AssetTypes.AnyAsync(t => t.Id == request.AssetTypeId && !t.IsArchived);
        if (!assetTypeExists)
            return BadRequest(new { error = "Asset type not found." });

        // Validate Location exists (if provided)
        if (request.LocationId is not null)
        {
            var locationExists = await db.Locations.AnyAsync(l => l.Id == request.LocationId && !l.IsArchived);
            if (!locationExists)
                return BadRequest(new { error = "Location not found." });
        }

        // Validate AssignedPerson exists (if provided)
        if (request.AssignedPersonId is not null)
        {
            var personExists = await db.People.AnyAsync(p => p.Id == request.AssignedPersonId && !p.IsArchived);
            if (!personExists)
                return BadRequest(new { error = "Assigned person not found." });
        }

        // Validate AssetTag unique (excluding self)
        var tagExists = await db.Assets.AnyAsync(a => a.AssetTag == request.AssetTag && a.Id != id);
        if (tagExists)
            return Conflict(new { error = "An asset with this tag already exists." });

        // Parse status
        AssetStatus? newStatus = null;
        if (!string.IsNullOrEmpty(request.Status))
        {
            if (!Enum.TryParse<AssetStatus>(request.Status, out var parsedStatus))
                return BadRequest(new { error = $"Invalid status: {request.Status}" });
            newStatus = parsedStatus;
        }

        // Detect changes before applying
        var changes = new List<AuditChange>();

        Track(changes, "Name", asset.Name, request.Name);
        Track(changes, "Asset Tag", asset.AssetTag, request.AssetTag);
        Track(changes, "Serial Number", asset.SerialNumber, request.SerialNumber);
        Track(changes, "Notes", asset.Notes, request.Notes);

        if (newStatus is not null && newStatus != asset.Status)
            changes.Add(new AuditChange("Status", asset.Status.ToString(), newStatus.ToString()!));

        if (request.AssetTypeId != asset.AssetTypeId)
        {
            var newTypeName = await db.AssetTypes.Where(t => t.Id == request.AssetTypeId).Select(t => t.Name).FirstAsync();
            changes.Add(new AuditChange("Type", asset.AssetType.Name, newTypeName));
        }

        if (request.LocationId != asset.LocationId)
        {
            var oldName = asset.Location?.Name;
            string? newName = null;
            if (request.LocationId is not null)
                newName = await db.Locations.Where(l => l.Id == request.LocationId).Select(l => l.Name).FirstAsync();
            changes.Add(new AuditChange("Location", oldName, newName));
        }

        Guid? oldAssignedPersonId = null;
        string? oldAssignedPersonName = null;
        Guid? newAssignedPersonId = null;
        string? newAssignedPersonName = null;

        if (request.AssignedPersonId != asset.AssignedPersonId)
        {
            oldAssignedPersonId = asset.AssignedPersonId;
            oldAssignedPersonName = asset.AssignedPerson?.FullName;
            newAssignedPersonId = request.AssignedPersonId;
            if (request.AssignedPersonId is not null)
                newAssignedPersonName = await db.People.Where(p => p.Id == request.AssignedPersonId).Select(p => p.FullName).FirstAsync();
            changes.Add(new AuditChange("Assigned To", oldAssignedPersonName, newAssignedPersonName));
        }

        TrackDate(changes, "Purchase Date", asset.PurchaseDate, request.PurchaseDate);
        TrackDecimal(changes, "Purchase Cost", asset.PurchaseCost, request.PurchaseCost);
        TrackDate(changes, "Warranty Expiry", asset.WarrantyExpiryDate, request.WarrantyExpiryDate);

        // Apply changes
        asset.Name = request.Name;
        asset.AssetTag = request.AssetTag;
        asset.SerialNumber = request.SerialNumber;
        asset.AssetTypeId = request.AssetTypeId;
        asset.LocationId = request.LocationId;
        asset.AssignedPersonId = request.AssignedPersonId;
        asset.PurchaseDate = request.PurchaseDate;
        asset.PurchaseCost = request.PurchaseCost;
        asset.WarrantyExpiryDate = request.WarrantyExpiryDate;
        asset.Notes = request.Notes;
        if (newStatus is not null) asset.Status = newStatus.Value;
        asset.UpdatedAt = DateTime.UtcNow;

        // Upsert custom field values
        if (request.CustomFieldValues is not null)
        {
            var existingValues = asset.CustomFieldValues.ToDictionary(v => v.CustomFieldDefinitionId);

            var validDefIds = await db.CustomFieldDefinitions
                .Where(d => d.AssetTypeId == request.AssetTypeId && !d.IsArchived)
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
                        EntityId = asset.Id,
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
            EntityType: "Asset",
            EntityId: asset.Id.ToString(),
            EntityName: asset.Name,
            Details: $"Updated asset \"{asset.Name}\" ({asset.AssetTag})",
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName,
            Changes: changes.Count > 0 ? changes : null));

        // Log assignment changes to person history
        if (oldAssignedPersonId is not null && oldAssignedPersonId != newAssignedPersonId)
        {
            await audit.LogAsync(new AuditEntry(
                Action: "AssetUnassigned",
                EntityType: "Person",
                EntityId: oldAssignedPersonId.Value.ToString(),
                EntityName: oldAssignedPersonName,
                Details: $"Asset \"{asset.Name}\" ({asset.AssetTag}) unassigned from this person",
                ActorId: currentUser.UserId,
                ActorName: currentUser.UserName));
        }
        if (newAssignedPersonId is not null && newAssignedPersonId != oldAssignedPersonId)
        {
            await audit.LogAsync(new AuditEntry(
                Action: "AssetAssigned",
                EntityType: "Person",
                EntityId: newAssignedPersonId.Value.ToString(),
                EntityName: newAssignedPersonName,
                Details: $"Asset \"{asset.Name}\" ({asset.AssetTag}) assigned to this person",
                ActorId: currentUser.UserId,
                ActorName: currentUser.UserName));
        }

        // Reload navigation properties
        await db.Entry(asset).Reference(a => a.AssetType).LoadAsync();
        if (asset.LocationId is not null)
            await db.Entry(asset).Reference(a => a.Location).LoadAsync();
        if (asset.AssignedPersonId is not null)
            await db.Entry(asset).Reference(a => a.AssignedPerson).LoadAsync();
        await db.Entry(asset).Collection(a => a.CustomFieldValues).LoadAsync();
        foreach (var v in asset.CustomFieldValues)
            await db.Entry(v).Reference(v2 => v2.CustomFieldDefinition).LoadAsync();

        return Ok(ToDto(asset));
    }

    [HttpGet("{id:guid}/history")]
    public async Task<ActionResult<List<AssetHistoryDto>>> GetHistory(Guid id, [FromQuery] int? limit = null)
    {
        var assetExists = await db.Assets.AnyAsync(a => a.Id == id);
        if (!assetExists) return NotFound();

        var query = db.AssetHistory
            .Where(h => h.AssetId == id)
            .Include(h => h.PerformedByUser)
            .Include(h => h.Changes)
            .OrderByDescending(h => h.Timestamp);

        var historyQuery = limit.HasValue ? query.Take(limit.Value) : query;

        var history = await historyQuery
            .Select(h => new AssetHistoryDto(
                h.Id,
                h.EventType.ToString(),
                h.Details,
                h.Timestamp,
                h.PerformedByUser != null ? h.PerformedByUser.DisplayName : null,
                h.Changes.Select(c => new AssetHistoryChangeDto(
                    c.FieldName, c.OldValue, c.NewValue)).ToList()))
            .ToListAsync();

        return Ok(history);
    }

    [HttpPost("{id:guid}/checkout")]
    public async Task<ActionResult<AssetDto>> Checkout(Guid id, CheckoutAssetRequest request)
    {
        var asset = await db.Assets
            .Include(a => a.AssetType)
            .Include(a => a.Location)
            .Include(a => a.AssignedPerson)
            .Include(a => a.CustomFieldValues)
                .ThenInclude(v => v.CustomFieldDefinition)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (asset is null) return NotFound();
        if (asset.IsArchived) return BadRequest(new { error = "Cannot check out an archived asset." });

        if (asset.Status != AssetStatus.Available && asset.Status != AssetStatus.Assigned)
            return BadRequest(new { error = $"Asset must be Available or Assigned to check out. Current status: {asset.Status}" });

        var person = await db.People.FirstOrDefaultAsync(p => p.Id == request.PersonId && !p.IsArchived);
        if (person is null) return BadRequest(new { error = "Person not found." });

        var changes = new List<AuditChange>();
        changes.Add(new AuditChange("Status", asset.Status.ToString(), AssetStatus.CheckedOut.ToString()));

        var oldPersonName = asset.AssignedPerson?.FullName;
        if (asset.AssignedPersonId != request.PersonId)
            changes.Add(new AuditChange("Assigned To", oldPersonName, person.FullName));

        asset.Status = AssetStatus.CheckedOut;
        asset.AssignedPersonId = request.PersonId;
        asset.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "CheckedOut",
            EntityType: "Asset",
            EntityId: asset.Id.ToString(),
            EntityName: asset.Name,
            Details: $"Checked out \"{asset.Name}\" to {person.FullName}" + (request.Notes is not null ? $" — {request.Notes}" : ""),
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName,
            Changes: changes));

        // Log to person history
        await audit.LogAsync(new AuditEntry(
            Action: "AssetCheckedOut",
            EntityType: "Person",
            EntityId: person.Id.ToString(),
            EntityName: person.FullName,
            Details: $"Asset \"{asset.Name}\" ({asset.AssetTag}) checked out to this person",
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName));

        await db.Entry(asset).Reference(a => a.AssetType).LoadAsync();
        if (asset.LocationId is not null)
            await db.Entry(asset).Reference(a => a.Location).LoadAsync();
        await db.Entry(asset).Reference(a => a.AssignedPerson).LoadAsync();

        return Ok(ToDto(asset));
    }

    [HttpPost("{id:guid}/checkin")]
    public async Task<ActionResult<AssetDto>> Checkin(Guid id, CheckinAssetRequest request)
    {
        var asset = await db.Assets
            .Include(a => a.AssetType)
            .Include(a => a.Location)
            .Include(a => a.AssignedPerson)
            .Include(a => a.CustomFieldValues)
                .ThenInclude(v => v.CustomFieldDefinition)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (asset is null) return NotFound();
        if (asset.IsArchived) return BadRequest(new { error = "Cannot check in an archived asset." });

        if (asset.Status != AssetStatus.CheckedOut)
            return BadRequest(new { error = $"Asset must be CheckedOut to check in. Current status: {asset.Status}" });

        var changes = new List<AuditChange>();
        changes.Add(new AuditChange("Status", asset.Status.ToString(), AssetStatus.Available.ToString()));

        var oldPersonId = asset.AssignedPersonId;
        var oldPersonName = asset.AssignedPerson?.FullName;
        if (oldPersonName is not null)
            changes.Add(new AuditChange("Assigned To", oldPersonName, null));

        var detailParts = $"Checked in \"{asset.Name}\"";
        if (oldPersonName is not null)
            detailParts += $" from {oldPersonName}";
        if (request.Notes is not null)
            detailParts += $" — {request.Notes}";

        asset.Status = AssetStatus.Available;
        asset.AssignedPersonId = null;
        asset.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "CheckedIn",
            EntityType: "Asset",
            EntityId: asset.Id.ToString(),
            EntityName: asset.Name,
            Details: detailParts,
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName,
            Changes: changes));

        // Log to person history
        if (oldPersonId is not null)
        {
            await audit.LogAsync(new AuditEntry(
                Action: "AssetCheckedIn",
                EntityType: "Person",
                EntityId: oldPersonId.Value.ToString(),
                EntityName: oldPersonName,
                Details: $"Asset \"{asset.Name}\" ({asset.AssetTag}) checked in from this person",
                ActorId: currentUser.UserId,
                ActorName: currentUser.UserName));
        }

        await db.Entry(asset).Reference(a => a.AssetType).LoadAsync();
        if (asset.LocationId is not null)
            await db.Entry(asset).Reference(a => a.Location).LoadAsync();

        return Ok(ToDto(asset));
    }

    [HttpPost("{id:guid}/retire")]
    public async Task<ActionResult<AssetDto>> Retire(Guid id, RetireAssetRequest request)
    {
        var asset = await db.Assets
            .Include(a => a.AssetType)
            .Include(a => a.Location)
            .Include(a => a.AssignedPerson)
            .Include(a => a.CustomFieldValues)
                .ThenInclude(v => v.CustomFieldDefinition)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (asset is null) return NotFound();
        if (asset.IsArchived) return BadRequest(new { error = "Cannot retire an archived asset." });
        if (asset.Status == AssetStatus.Retired) return BadRequest(new { error = "Asset is already retired." });
        if (asset.Status == AssetStatus.Sold) return BadRequest(new { error = "Cannot retire a sold asset." });

        var changes = new List<AuditChange>();
        changes.Add(new AuditChange("Status", asset.Status.ToString(), AssetStatus.Retired.ToString()));

        var oldPersonId = asset.AssignedPersonId;
        var oldPersonName = asset.AssignedPerson?.FullName;
        if (oldPersonName is not null)
            changes.Add(new AuditChange("Assigned To", oldPersonName, null));

        changes.Add(new AuditChange("Retired Date", null, DateTime.UtcNow.ToString("yyyy-MM-dd")));

        asset.Status = AssetStatus.Retired;
        asset.RetiredDate = DateTime.UtcNow;
        asset.AssignedPersonId = null;
        asset.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        var details = $"Retired asset \"{asset.Name}\" ({asset.AssetTag})";
        if (request.Notes is not null) details += $" — {request.Notes}";

        await audit.LogAsync(new AuditEntry(
            Action: "Retired",
            EntityType: "Asset",
            EntityId: asset.Id.ToString(),
            EntityName: asset.Name,
            Details: details,
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName,
            Changes: changes));

        // Log to person history
        if (oldPersonId is not null)
        {
            await audit.LogAsync(new AuditEntry(
                Action: "AssetUnassigned",
                EntityType: "Person",
                EntityId: oldPersonId.Value.ToString(),
                EntityName: oldPersonName,
                Details: $"Asset \"{asset.Name}\" ({asset.AssetTag}) unassigned (asset retired)",
                ActorId: currentUser.UserId,
                ActorName: currentUser.UserName));
        }

        await db.Entry(asset).Reference(a => a.AssetType).LoadAsync();
        if (asset.LocationId is not null)
            await db.Entry(asset).Reference(a => a.Location).LoadAsync();

        return Ok(ToDto(asset));
    }

    [HttpPost("{id:guid}/sell")]
    public async Task<ActionResult<AssetDto>> Sell(Guid id, SellAssetRequest request)
    {
        var asset = await db.Assets
            .Include(a => a.AssetType)
            .Include(a => a.Location)
            .Include(a => a.AssignedPerson)
            .Include(a => a.CustomFieldValues)
                .ThenInclude(v => v.CustomFieldDefinition)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (asset is null) return NotFound();
        if (asset.IsArchived) return BadRequest(new { error = "Cannot sell an archived asset." });
        if (asset.Status == AssetStatus.Sold) return BadRequest(new { error = "Asset is already sold." });
        if (asset.Status == AssetStatus.Retired) return BadRequest(new { error = "Cannot sell a retired asset." });

        var changes = new List<AuditChange>();
        changes.Add(new AuditChange("Status", asset.Status.ToString(), AssetStatus.Sold.ToString()));

        var oldPersonId = asset.AssignedPersonId;
        var oldPersonName = asset.AssignedPerson?.FullName;
        if (oldPersonName is not null)
            changes.Add(new AuditChange("Assigned To", oldPersonName, null));

        var soldDate = request.SoldDate ?? DateTime.UtcNow;
        changes.Add(new AuditChange("Sold Date", null, soldDate.ToString("yyyy-MM-dd")));

        if (request.SoldPrice is not null)
            changes.Add(new AuditChange("Sold Price", null, request.SoldPrice.Value.ToString("F2")));

        asset.Status = AssetStatus.Sold;
        asset.SoldDate = soldDate;
        asset.SoldPrice = request.SoldPrice;
        asset.AssignedPersonId = null;
        asset.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        var details = $"Sold asset \"{asset.Name}\" ({asset.AssetTag})";
        if (request.SoldPrice is not null)
            details += $" for {request.SoldPrice.Value:F2}";
        if (request.Notes is not null) details += $" — {request.Notes}";

        await audit.LogAsync(new AuditEntry(
            Action: "Sold",
            EntityType: "Asset",
            EntityId: asset.Id.ToString(),
            EntityName: asset.Name,
            Details: details,
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName,
            Changes: changes));

        // Log to person history
        if (oldPersonId is not null)
        {
            await audit.LogAsync(new AuditEntry(
                Action: "AssetUnassigned",
                EntityType: "Person",
                EntityId: oldPersonId.Value.ToString(),
                EntityName: oldPersonName,
                Details: $"Asset \"{asset.Name}\" ({asset.AssetTag}) unassigned (asset sold)",
                ActorId: currentUser.UserId,
                ActorName: currentUser.UserName));
        }

        await db.Entry(asset).Reference(a => a.AssetType).LoadAsync();
        if (asset.LocationId is not null)
            await db.Entry(asset).Reference(a => a.Location).LoadAsync();

        return Ok(ToDto(asset));
    }

    [HttpPost("bulk-archive")]
    public async Task<ActionResult<BulkActionResponse>> BulkArchive(BulkArchiveRequest request)
    {
        int succeeded = 0, failed = 0;
        foreach (var id in request.Ids)
        {
            var asset = await db.Assets.FindAsync(id);
            if (asset is null || asset.IsArchived) { failed++; continue; }

            asset.IsArchived = true;
            asset.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            await audit.LogAsync(new AuditEntry(
                Action: "Archived",
                EntityType: "Asset",
                EntityId: asset.Id.ToString(),
                EntityName: asset.Name,
                Details: $"Bulk archived asset \"{asset.Name}\" ({asset.AssetTag})",
                ActorId: currentUser.UserId,
                ActorName: currentUser.UserName));
            succeeded++;
        }
        return Ok(new BulkActionResponse(succeeded, failed));
    }

    [HttpPost("bulk-status")]
    public async Task<ActionResult<BulkActionResponse>> BulkStatus(BulkStatusRequest request)
    {
        if (!Enum.TryParse<AssetStatus>(request.Status, out var newStatus))
            return BadRequest(new { error = $"Invalid status: {request.Status}" });

        int succeeded = 0, failed = 0;
        foreach (var id in request.Ids)
        {
            var asset = await db.Assets.FindAsync(id);
            if (asset is null || asset.IsArchived) { failed++; continue; }

            var oldStatus = asset.Status;
            asset.Status = newStatus;
            asset.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            await audit.LogAsync(new AuditEntry(
                Action: "StatusChanged",
                EntityType: "Asset",
                EntityId: asset.Id.ToString(),
                EntityName: asset.Name,
                Details: $"Bulk status change \"{asset.Name}\" ({asset.AssetTag}): {oldStatus} → {newStatus}",
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
        var asset = await db.Assets.FindAsync(id);
        if (asset is null) return NotFound();

        asset.IsArchived = true;
        asset.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Archived",
            EntityType: "Asset",
            EntityId: asset.Id.ToString(),
            EntityName: asset.Name,
            Details: $"Archived asset \"{asset.Name}\" ({asset.AssetTag})",
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName));

        return NoContent();
    }

    private static AssetDto ToDto(Asset a) => new(
        a.Id, a.Name, a.AssetTag, a.SerialNumber,
        a.Status.ToString(),
        a.AssetTypeId, a.AssetType.Name,
        a.LocationId, a.Location?.Name,
        a.AssignedPersonId, a.AssignedPerson?.FullName,
        a.PurchaseDate, a.PurchaseCost, a.WarrantyExpiryDate,
        a.SoldDate, a.SoldPrice, a.RetiredDate,
        a.Notes, a.IsArchived, a.CreatedAt, a.UpdatedAt,
        a.CustomFieldValues
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

    private static void TrackDecimal(List<AuditChange> changes, string field, decimal? oldVal, decimal? newVal)
    {
        if (oldVal != newVal)
            changes.Add(new AuditChange(field, oldVal?.ToString("F2"), newVal?.ToString("F2")));
    }
}
