using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using AssetManagement.Api.Models;
using AssetManagement.Api.Models.Enums;
using AssetManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public class CertificatesController(AppDbContext db, IAuditService audit, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResponse<CertificateDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? includeStatuses = null,
        [FromQuery] string sortBy = "name",
        [FromQuery] string sortDir = "asc")
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Certificates
            .Where(c => !c.IsArchived)
            .Include(c => c.CertificateType)
            .Include(c => c.Asset)
            .Include(c => c.Person)
            .Include(c => c.Location)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(c =>
                EF.Functions.ILike(c.Name, $"%{search}%") ||
                (c.Issuer != null && EF.Functions.ILike(c.Issuer, $"%{search}%")) ||
                (c.Subject != null && EF.Functions.ILike(c.Subject, $"%{search}%")));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<CertificateStatus>(status, out var parsedStatus))
                return BadRequest(new { error = $"Invalid status: {status}" });
            query = query.Where(c => c.Status == parsedStatus);
        }

        var totalCount = await query.CountAsync();

        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        query = sortBy.ToLowerInvariant() switch
        {
            "issuer" => desc ? query.OrderByDescending(c => c.Issuer) : query.OrderBy(c => c.Issuer),
            "subject" => desc ? query.OrderByDescending(c => c.Subject) : query.OrderBy(c => c.Subject),
            "expirydate" => desc ? query.OrderByDescending(c => c.ExpiryDate) : query.OrderBy(c => c.ExpiryDate),
            "status" => desc ? query.OrderByDescending(c => c.Status) : query.OrderBy(c => c.Status),
            "certificatetypename" => desc ? query.OrderByDescending(c => c.CertificateType.Name) : query.OrderBy(c => c.CertificateType.Name),
            "createdat" => desc ? query.OrderByDescending(c => c.CreatedAt) : query.OrderBy(c => c.CreatedAt),
            _ => desc ? query.OrderByDescending(c => c.Name) : query.OrderBy(c => c.Name),
        };

        var certificates = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // Load custom field values manually (polymorphic FK — not mapped in EF)
        var certIds = certificates.Select(c => c.Id).ToList();
        var cfvs = await db.CustomFieldValues
            .Where(v => certIds.Contains(v.EntityId))
            .Include(v => v.CustomFieldDefinition)
            .ToListAsync();
        var cfvsByEntity = cfvs.GroupBy(v => v.EntityId).ToDictionary(g => g.Key, g => g.ToList());

        var result = new PagedResponse<CertificateDto>(
            certificates.Select(c => ToDto(c, cfvsByEntity.GetValueOrDefault(c.Id))).ToList(),
            page,
            pageSize,
            totalCount);

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CertificateDto>> GetById(Guid id)
    {
        var cert = await db.Certificates
            .Include(c => c.CertificateType)
            .Include(c => c.Asset)
            .Include(c => c.Person)
            .Include(c => c.Location)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cert is null) return NotFound();

        var cfvs = await LoadCustomFieldValues(cert.Id);

        return Ok(ToDto(cert, cfvs));
    }

    [HttpPost]
    public async Task<ActionResult<CertificateDto>> Create(CreateCertificateRequest request)
    {
        var certTypeExists = await db.CertificateTypes.AnyAsync(t => t.Id == request.CertificateTypeId && !t.IsArchived);
        if (!certTypeExists)
            return BadRequest(new { error = "Certificate type not found." });

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

        var status = CertificateStatus.Active;
        if (!string.IsNullOrEmpty(request.Status))
        {
            if (!Enum.TryParse<CertificateStatus>(request.Status, out status))
                return BadRequest(new { error = $"Invalid status: {request.Status}" });
        }

        var cert = new Certificate
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            CertificateTypeId = request.CertificateTypeId,
            Issuer = request.Issuer,
            Subject = request.Subject,
            Thumbprint = request.Thumbprint,
            SerialNumber = request.SerialNumber,
            IssuedDate = request.IssuedDate,
            ExpiryDate = request.ExpiryDate,
            Status = status,
            AutoRenewal = request.AutoRenewal,
            Notes = request.Notes,
            AssetId = request.AssetId,
            PersonId = request.PersonId,
            LocationId = request.LocationId,
        };

        db.Certificates.Add(cert);

        if (request.CustomFieldValues is { Count: > 0 })
        {
            var validDefIds = await db.CustomFieldDefinitions
                .Where(d => d.CertificateTypeId == request.CertificateTypeId && !d.IsArchived)
                .Select(d => d.Id)
                .ToListAsync();
            var validDefIdSet = validDefIds.ToHashSet();

            foreach (var cfv in request.CustomFieldValues)
            {
                if (!validDefIdSet.Contains(cfv.FieldDefinitionId))
                    return BadRequest(new { error = $"Custom field definition {cfv.FieldDefinitionId} not found for this certificate type." });

                db.CustomFieldValues.Add(new CustomFieldValue
                {
                    Id = Guid.NewGuid(),
                    CustomFieldDefinitionId = cfv.FieldDefinitionId,
                    EntityId = cert.Id,
                    Value = cfv.Value
                });
            }
        }

        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Created",
            EntityType: "Certificate",
            EntityId: cert.Id.ToString(),
            EntityName: cert.Name,
            Details: $"Created certificate \"{cert.Name}\"",
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName));

        // Reload with navigation properties
        await db.Entry(cert).Reference(c => c.CertificateType).LoadAsync();
        if (cert.AssetId is not null)
            await db.Entry(cert).Reference(c => c.Asset).LoadAsync();
        if (cert.PersonId is not null)
            await db.Entry(cert).Reference(c => c.Person).LoadAsync();
        if (cert.LocationId is not null)
            await db.Entry(cert).Reference(c => c.Location).LoadAsync();

        var cfvs = await LoadCustomFieldValues(cert.Id);

        return CreatedAtAction(nameof(GetById), new { id = cert.Id }, ToDto(cert, cfvs));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CertificateDto>> Update(Guid id, UpdateCertificateRequest request)
    {
        var cert = await db.Certificates
            .Include(c => c.CertificateType)
            .Include(c => c.Asset)
            .Include(c => c.Person)
            .Include(c => c.Location)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cert is null) return NotFound();

        // Load custom field values manually
        var existingCfvs = await LoadCustomFieldValues(cert.Id);

        var certTypeExists = await db.CertificateTypes.AnyAsync(t => t.Id == request.CertificateTypeId && !t.IsArchived);
        if (!certTypeExists)
            return BadRequest(new { error = "Certificate type not found." });

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

        CertificateStatus? newStatus = null;
        if (!string.IsNullOrEmpty(request.Status))
        {
            if (!Enum.TryParse<CertificateStatus>(request.Status, out var parsedStatus))
                return BadRequest(new { error = $"Invalid status: {request.Status}" });
            newStatus = parsedStatus;
        }

        // Detect changes
        var changes = new List<AuditChange>();

        Track(changes, "Name", cert.Name, request.Name);
        Track(changes, "Issuer", cert.Issuer, request.Issuer);
        Track(changes, "Subject", cert.Subject, request.Subject);
        Track(changes, "Thumbprint", cert.Thumbprint, request.Thumbprint);
        Track(changes, "Serial Number", cert.SerialNumber, request.SerialNumber);
        Track(changes, "Notes", cert.Notes, request.Notes);

        if (newStatus is not null && newStatus != cert.Status)
            changes.Add(new AuditChange("Status", cert.Status.ToString(), newStatus.ToString()!));

        if (request.CertificateTypeId != cert.CertificateTypeId)
        {
            var newTypeName = await db.CertificateTypes.Where(t => t.Id == request.CertificateTypeId).Select(t => t.Name).FirstAsync();
            changes.Add(new AuditChange("Type", cert.CertificateType.Name, newTypeName));
        }

        TrackDate(changes, "Issued Date", cert.IssuedDate, request.IssuedDate);
        TrackDate(changes, "Expiry Date", cert.ExpiryDate, request.ExpiryDate);
        TrackBool(changes, "Auto Renewal", cert.AutoRenewal, request.AutoRenewal);

        if (request.AssetId != cert.AssetId)
        {
            var oldName = cert.Asset?.Name;
            string? newName = null;
            if (request.AssetId is not null)
                newName = await db.Assets.Where(a => a.Id == request.AssetId).Select(a => a.Name).FirstAsync();
            changes.Add(new AuditChange("Asset", oldName, newName));
        }

        if (request.PersonId != cert.PersonId)
        {
            var oldName = cert.Person?.FullName;
            string? newName = null;
            if (request.PersonId is not null)
                newName = await db.People.Where(p => p.Id == request.PersonId).Select(p => p.FullName).FirstAsync();
            changes.Add(new AuditChange("Person", oldName, newName));
        }

        if (request.LocationId != cert.LocationId)
        {
            var oldName = cert.Location?.Name;
            string? newName = null;
            if (request.LocationId is not null)
                newName = await db.Locations.Where(l => l.Id == request.LocationId).Select(l => l.Name).FirstAsync();
            changes.Add(new AuditChange("Location", oldName, newName));
        }

        // Apply changes
        cert.Name = request.Name;
        cert.CertificateTypeId = request.CertificateTypeId;
        cert.Issuer = request.Issuer;
        cert.Subject = request.Subject;
        cert.Thumbprint = request.Thumbprint;
        cert.SerialNumber = request.SerialNumber;
        cert.IssuedDate = request.IssuedDate;
        cert.ExpiryDate = request.ExpiryDate;
        cert.AutoRenewal = request.AutoRenewal;
        cert.Notes = request.Notes;
        cert.AssetId = request.AssetId;
        cert.PersonId = request.PersonId;
        cert.LocationId = request.LocationId;
        if (newStatus is not null) cert.Status = newStatus.Value;
        cert.UpdatedAt = DateTime.UtcNow;

        // Upsert custom field values
        if (request.CustomFieldValues is not null)
        {
            var existingValues = existingCfvs.ToDictionary(v => v.CustomFieldDefinitionId);

            var validDefIds = await db.CustomFieldDefinitions
                .Where(d => d.CertificateTypeId == request.CertificateTypeId && !d.IsArchived)
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
                        EntityId = cert.Id,
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
            EntityType: "Certificate",
            EntityId: cert.Id.ToString(),
            EntityName: cert.Name,
            Details: $"Updated certificate \"{cert.Name}\"",
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName,
            Changes: changes.Count > 0 ? changes : null));

        // Reload navigation properties
        await db.Entry(cert).Reference(c => c.CertificateType).LoadAsync();
        if (cert.AssetId is not null)
            await db.Entry(cert).Reference(c => c.Asset).LoadAsync();
        if (cert.PersonId is not null)
            await db.Entry(cert).Reference(c => c.Person).LoadAsync();
        if (cert.LocationId is not null)
            await db.Entry(cert).Reference(c => c.Location).LoadAsync();

        var updatedCfvs = await LoadCustomFieldValues(cert.Id);

        return Ok(ToDto(cert, updatedCfvs));
    }

    [HttpGet("{id:guid}/history")]
    public async Task<ActionResult<List<CertificateHistoryDto>>> GetHistory(Guid id, [FromQuery] int? limit = null)
    {
        var certExists = await db.Certificates.AnyAsync(c => c.Id == id);
        if (!certExists) return NotFound();

        var query = db.CertificateHistory
            .Where(h => h.CertificateId == id)
            .Include(h => h.PerformedByUser)
            .Include(h => h.Changes)
            .OrderByDescending(h => h.Timestamp);

        var historyQuery = limit.HasValue ? query.Take(limit.Value) : query;

        var history = await historyQuery
            .Select(h => new CertificateHistoryDto(
                h.Id,
                h.EventType.ToString(),
                h.Details,
                h.Timestamp,
                h.PerformedByUser != null ? h.PerformedByUser.DisplayName : null,
                h.Changes.Select(c => new CertificateHistoryChangeDto(
                    c.FieldName, c.OldValue, c.NewValue)).ToList()))
            .ToListAsync();

        return Ok(history);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Archive(Guid id)
    {
        var cert = await db.Certificates.FindAsync(id);
        if (cert is null) return NotFound();

        cert.IsArchived = true;
        cert.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Archived",
            EntityType: "Certificate",
            EntityId: cert.Id.ToString(),
            EntityName: cert.Name,
            Details: $"Archived certificate \"{cert.Name}\"",
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName));

        return NoContent();
    }

    private async Task<List<CustomFieldValue>> LoadCustomFieldValues(Guid certId)
    {
        return await db.CustomFieldValues
            .Where(v => v.EntityId == certId)
            .Include(v => v.CustomFieldDefinition)
            .ToListAsync();
    }

    private static CertificateDto ToDto(Certificate c, List<CustomFieldValue>? cfvs = null) => new(
        c.Id, c.Name,
        c.CertificateTypeId, c.CertificateType.Name,
        c.Issuer, c.Subject, c.Thumbprint, c.SerialNumber,
        c.IssuedDate, c.ExpiryDate,
        c.Status.ToString(),
        c.AutoRenewal, c.Notes,
        c.AssetId, c.Asset?.Name,
        c.PersonId, c.Person?.FullName,
        c.LocationId, c.Location?.Name,
        c.IsArchived, c.CreatedAt, c.UpdatedAt,
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
}
