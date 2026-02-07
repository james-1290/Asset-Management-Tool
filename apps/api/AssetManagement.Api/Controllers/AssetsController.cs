using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using AssetManagement.Api.Models;
using AssetManagement.Api.Models.Enums;
using AssetManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AssetsController(AppDbContext db, IAuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<AssetDto>>> GetAll()
    {
        var assets = await db.Assets
            .Where(a => !a.IsArchived)
            .Include(a => a.AssetType)
            .Include(a => a.Location)
            .Include(a => a.AssignedPerson)
            .OrderBy(a => a.Name)
            .Select(a => new AssetDto(
                a.Id, a.Name, a.AssetTag, a.SerialNumber,
                a.Status.ToString(),
                a.AssetTypeId, a.AssetType.Name,
                a.LocationId, a.Location != null ? a.Location.Name : null,
                a.AssignedPersonId, a.AssignedPerson != null ? a.AssignedPerson.FullName : null,
                a.PurchaseDate, a.PurchaseCost, a.WarrantyExpiryDate,
                a.Notes, a.IsArchived, a.CreatedAt, a.UpdatedAt))
            .ToListAsync();

        return Ok(assets);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AssetDto>> GetById(Guid id)
    {
        var asset = await db.Assets
            .Include(a => a.AssetType)
            .Include(a => a.Location)
            .Include(a => a.AssignedPerson)
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
        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Created",
            EntityType: "Asset",
            EntityId: asset.Id.ToString(),
            Details: $"Created asset \"{asset.Name}\" ({asset.AssetTag})"));

        // Reload with navigation properties
        await db.Entry(asset).Reference(a => a.AssetType).LoadAsync();
        if (asset.LocationId is not null)
            await db.Entry(asset).Reference(a => a.Location).LoadAsync();
        if (asset.AssignedPersonId is not null)
            await db.Entry(asset).Reference(a => a.AssignedPerson).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = asset.Id }, ToDto(asset));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AssetDto>> Update(Guid id, UpdateAssetRequest request)
    {
        var asset = await db.Assets
            .Include(a => a.AssetType)
            .Include(a => a.Location)
            .Include(a => a.AssignedPerson)
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

        if (request.AssignedPersonId != asset.AssignedPersonId)
        {
            var oldName = asset.AssignedPerson?.FullName;
            string? newName = null;
            if (request.AssignedPersonId is not null)
                newName = await db.People.Where(p => p.Id == request.AssignedPersonId).Select(p => p.FullName).FirstAsync();
            changes.Add(new AuditChange("Assigned To", oldName, newName));
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

        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Updated",
            EntityType: "Asset",
            EntityId: asset.Id.ToString(),
            Details: $"Updated asset \"{asset.Name}\" ({asset.AssetTag})",
            Changes: changes.Count > 0 ? changes : null));

        // Reload navigation properties
        await db.Entry(asset).Reference(a => a.AssetType).LoadAsync();
        if (asset.LocationId is not null)
            await db.Entry(asset).Reference(a => a.Location).LoadAsync();
        if (asset.AssignedPersonId is not null)
            await db.Entry(asset).Reference(a => a.AssignedPerson).LoadAsync();

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
            Details: $"Archived asset \"{asset.Name}\" ({asset.AssetTag})"));

        return NoContent();
    }

    private static AssetDto ToDto(Asset a) => new(
        a.Id, a.Name, a.AssetTag, a.SerialNumber,
        a.Status.ToString(),
        a.AssetTypeId, a.AssetType.Name,
        a.LocationId, a.Location?.Name,
        a.AssignedPersonId, a.AssignedPerson?.FullName,
        a.PurchaseDate, a.PurchaseCost, a.WarrantyExpiryDate,
        a.Notes, a.IsArchived, a.CreatedAt, a.UpdatedAt);

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
