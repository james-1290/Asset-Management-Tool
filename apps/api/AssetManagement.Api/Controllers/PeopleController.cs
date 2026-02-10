using System.Globalization;
using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using AssetManagement.Api.Models;
using AssetManagement.Api.Services;
using CsvHelper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public class PeopleController(AppDbContext db, IAuditService audit, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet("search")]
    public async Task<ActionResult<List<PersonSearchResult>>> Search(
        [FromQuery] string? q = null,
        [FromQuery] int limit = 5)
    {
        var query = db.People.Where(p => !p.IsArchived);

        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(p => EF.Functions.ILike(p.FullName, $"%{q}%"));

        var results = await query
            .OrderBy(p => p.FullName)
            .Take(limit)
            .Select(p => new PersonSearchResult(p.Id, p.FullName))
            .ToListAsync();

        return Ok(results);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<PersonDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? search = null,
        [FromQuery] string sortBy = "fullname",
        [FromQuery] string sortDir = "asc")
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = ApplySorting(BuildFilteredQuery(search), sortBy, sortDir);

        var totalCount = await query.CountAsync();

        var people = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new PersonDto(
                p.Id, p.FullName, p.Email, p.Department, p.JobTitle,
                p.LocationId, p.Location != null ? p.Location.Name : null,
                p.IsArchived, p.CreatedAt, p.UpdatedAt))
            .ToListAsync();

        return Ok(new PagedResponse<PersonDto>(people, page, pageSize, totalCount));
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] string? search = null,
        [FromQuery] string sortBy = "fullname",
        [FromQuery] string sortDir = "asc",
        [FromQuery] string? ids = null)
    {
        List<Person> people;
        if (!string.IsNullOrEmpty(ids))
        {
            var idList = ids.Split(',').Select(id => Guid.TryParse(id.Trim(), out var g) ? g : (Guid?)null).Where(g => g.HasValue).Select(g => g!.Value).ToList();
            people = await db.People.Include(p => p.Location).Where(p => !p.IsArchived && idList.Contains(p.Id)).ToListAsync();
        }
        else
        {
            var query = ApplySorting(BuildFilteredQuery(search), sortBy, sortDir);
            people = await query.Include(p => p.Location).ToListAsync();
        }

        var ms = new MemoryStream();
        await using var writer = new StreamWriter(ms, leaveOpen: true);
        await using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        csv.WriteField("FullName");
        csv.WriteField("Email");
        csv.WriteField("Department");
        csv.WriteField("JobTitle");
        csv.WriteField("Location");
        csv.WriteField("CreatedAt");
        csv.WriteField("UpdatedAt");
        await csv.NextRecordAsync();

        foreach (var p in people)
        {
            csv.WriteField(p.FullName);
            csv.WriteField(p.Email);
            csv.WriteField(p.Department);
            csv.WriteField(p.JobTitle);
            csv.WriteField(p.Location?.Name);
            csv.WriteField(p.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"));
            csv.WriteField(p.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss"));
            await csv.NextRecordAsync();
        }

        await writer.FlushAsync();
        ms.Position = 0;

        return File(ms, "text/csv", "people-export.csv");
    }

    private IQueryable<Person> BuildFilteredQuery(string? search)
    {
        var query = db.People
            .Where(p => !p.IsArchived)
            .Include(p => p.Location)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(p =>
                EF.Functions.ILike(p.FullName, $"%{search}%") ||
                (p.Email != null && EF.Functions.ILike(p.Email, $"%{search}%")));
        }

        return query;
    }

    private static IQueryable<Person> ApplySorting(IQueryable<Person> query, string sortBy, string sortDir)
    {
        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        return sortBy.ToLowerInvariant() switch
        {
            "email" => desc ? query.OrderByDescending(p => p.Email) : query.OrderBy(p => p.Email),
            "department" => desc ? query.OrderByDescending(p => p.Department) : query.OrderBy(p => p.Department),
            "jobtitle" => desc ? query.OrderByDescending(p => p.JobTitle) : query.OrderBy(p => p.JobTitle),
            "locationname" => desc ? query.OrderByDescending(p => p.Location!.Name) : query.OrderBy(p => p.Location!.Name),
            "createdat" => desc ? query.OrderByDescending(p => p.CreatedAt) : query.OrderBy(p => p.CreatedAt),
            _ => desc ? query.OrderByDescending(p => p.FullName) : query.OrderBy(p => p.FullName),
        };
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PersonDto>> GetById(Guid id)
    {
        var person = await db.People
            .Include(p => p.Location)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (person is null) return NotFound();

        return Ok(new PersonDto(
            person.Id, person.FullName, person.Email, person.Department, person.JobTitle,
            person.LocationId, person.Location?.Name,
            person.IsArchived, person.CreatedAt, person.UpdatedAt));
    }

    [HttpPost]
    public async Task<ActionResult<PersonDto>> Create(CreatePersonRequest request)
    {
        if (request.LocationId.HasValue)
        {
            var location = await db.Locations.FindAsync(request.LocationId.Value);
            if (location is null || location.IsArchived)
                return BadRequest("Invalid location ID.");
        }

        var person = new Person
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName,
            Email = request.Email,
            Department = request.Department,
            JobTitle = request.JobTitle,
            LocationId = request.LocationId
        };

        db.People.Add(person);
        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Created",
            EntityType: "Person",
            EntityId: person.Id.ToString(),
            EntityName: person.FullName,
            Details: $"Created person \"{person.FullName}\"",
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName));

        // Reload with Location for response
        await db.Entry(person).Reference(p => p.Location).LoadAsync();

        var dto = new PersonDto(
            person.Id, person.FullName, person.Email, person.Department, person.JobTitle,
            person.LocationId, person.Location?.Name,
            person.IsArchived, person.CreatedAt, person.UpdatedAt);

        return CreatedAtAction(nameof(GetById), new { id = person.Id }, dto);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PersonDto>> Update(Guid id, UpdatePersonRequest request)
    {
        var person = await db.People.Include(p => p.Location).FirstOrDefaultAsync(p => p.Id == id);
        if (person is null) return NotFound();

        if (request.LocationId.HasValue)
        {
            var location = await db.Locations.FindAsync(request.LocationId.Value);
            if (location is null || location.IsArchived)
                return BadRequest("Invalid location ID.");
        }

        var changes = new List<AuditChange>();
        Track(changes, "Full Name", person.FullName, request.FullName);
        Track(changes, "Email", person.Email, request.Email);
        Track(changes, "Department", person.Department, request.Department);
        Track(changes, "Job Title", person.JobTitle, request.JobTitle);

        if (request.LocationId != person.LocationId)
        {
            var oldName = person.Location?.Name;
            string? newName = null;
            if (request.LocationId is not null)
                newName = await db.Locations.Where(l => l.Id == request.LocationId).Select(l => l.Name).FirstAsync();
            changes.Add(new AuditChange("Location", oldName, newName));
        }

        person.FullName = request.FullName;
        person.Email = request.Email;
        person.Department = request.Department;
        person.JobTitle = request.JobTitle;
        person.LocationId = request.LocationId;
        person.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Updated",
            EntityType: "Person",
            EntityId: person.Id.ToString(),
            EntityName: person.FullName,
            Details: $"Updated person \"{person.FullName}\"",
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName,
            Changes: changes));

        await db.Entry(person).Reference(p => p.Location).LoadAsync();

        return Ok(new PersonDto(
            person.Id, person.FullName, person.Email, person.Department, person.JobTitle,
            person.LocationId, person.Location?.Name,
            person.IsArchived, person.CreatedAt, person.UpdatedAt));
    }

    private static void Track(List<AuditChange> changes, string field, string? oldVal, string? newVal)
    {
        if (oldVal != newVal)
            changes.Add(new AuditChange(field, oldVal, newVal));
    }

    [HttpPost("bulk-archive")]
    public async Task<IActionResult> BulkArchive([FromBody] BulkArchiveRequest request)
    {
        int succeeded = 0, failed = 0;
        foreach (var id in request.Ids)
        {
            var person = await db.People.FindAsync(id);
            if (person is null || person.IsArchived) { failed++; continue; }

            person.IsArchived = true;
            person.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            await audit.LogAsync(new AuditEntry(
                Action: "Archived",
                EntityType: "Person",
                EntityId: person.Id.ToString(),
                EntityName: person.FullName,
                Details: $"Bulk archived person \"{person.FullName}\"",
                ActorId: currentUser.UserId,
                ActorName: currentUser.UserName));
            succeeded++;
        }
        return Ok(new BulkActionResponse(succeeded, failed));
    }

    [HttpGet("{id:guid}/history")]
    public async Task<ActionResult<List<PersonHistoryDto>>> GetHistory(
        Guid id,
        [FromQuery] int? limit = null)
    {
        var person = await db.People.FindAsync(id);
        if (person is null) return NotFound();

        var query = db.PersonHistory
            .Where(h => h.PersonId == id)
            .Include(h => h.PerformedByUser)
            .Include(h => h.Changes)
            .OrderByDescending(h => h.Timestamp)
            .AsQueryable();

        if (limit.HasValue)
            query = query.Take(limit.Value);

        var history = await query
            .Select(h => new PersonHistoryDto(
                h.Id,
                h.EventType.ToString(),
                h.Details,
                h.Timestamp,
                h.PerformedByUser != null ? h.PerformedByUser.DisplayName : null,
                h.Changes.Select(c => new PersonHistoryChangeDto(
                    c.FieldName, c.OldValue, c.NewValue
                )).ToList()))
            .ToListAsync();

        return Ok(history);
    }

    [HttpGet("{id:guid}/assets")]
    public async Task<ActionResult<List<AssignedAssetDto>>> GetAssignedAssets(Guid id)
    {
        var person = await db.People.FindAsync(id);
        if (person is null) return NotFound();

        var assets = await db.Assets
            .Where(a => a.AssignedPersonId == id && !a.IsArchived)
            .Include(a => a.AssetType)
            .Include(a => a.Location)
            .OrderBy(a => a.Name)
            .Select(a => new AssignedAssetDto(
                a.Id,
                a.Name,
                a.AssetTag,
                a.SerialNumber,
                a.Status.ToString(),
                a.AssetType!.Name,
                a.Location != null ? a.Location.Name : null))
            .ToListAsync();

        return Ok(assets);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Archive(Guid id)
    {
        var person = await db.People.FindAsync(id);
        if (person is null) return NotFound();

        person.IsArchived = true;
        person.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Archived",
            EntityType: "Person",
            EntityId: person.Id.ToString(),
            EntityName: person.FullName,
            Details: $"Archived person \"{person.FullName}\"",
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName));

        return NoContent();
    }
}
