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
public class LocationsController(AppDbContext db, IAuditService audit, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResponse<LocationDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? search = null,
        [FromQuery] string sortBy = "name",
        [FromQuery] string sortDir = "asc")
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = ApplySorting(BuildFilteredQuery(search), sortBy, sortDir);

        var totalCount = await query.CountAsync();

        var locations = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new LocationDto(
                l.Id, l.Name, l.Address, l.City, l.Country,
                l.IsArchived, l.CreatedAt, l.UpdatedAt))
            .ToListAsync();

        return Ok(new PagedResponse<LocationDto>(locations, page, pageSize, totalCount));
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] string? search = null,
        [FromQuery] string sortBy = "name",
        [FromQuery] string sortDir = "asc")
    {
        var query = ApplySorting(BuildFilteredQuery(search), sortBy, sortDir);
        var locations = await query.ToListAsync();

        var ms = new MemoryStream();
        await using var writer = new StreamWriter(ms, leaveOpen: true);
        await using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        csv.WriteField("Name");
        csv.WriteField("Address");
        csv.WriteField("City");
        csv.WriteField("Country");
        csv.WriteField("CreatedAt");
        csv.WriteField("UpdatedAt");
        await csv.NextRecordAsync();

        foreach (var l in locations)
        {
            csv.WriteField(l.Name);
            csv.WriteField(l.Address);
            csv.WriteField(l.City);
            csv.WriteField(l.Country);
            csv.WriteField(l.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"));
            csv.WriteField(l.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss"));
            await csv.NextRecordAsync();
        }

        await writer.FlushAsync();
        ms.Position = 0;

        return File(ms, "text/csv", "locations-export.csv");
    }

    private IQueryable<Location> BuildFilteredQuery(string? search)
    {
        var query = db.Locations
            .Where(l => !l.IsArchived)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(l => EF.Functions.ILike(l.Name, $"%{search}%"));

        return query;
    }

    private static IQueryable<Location> ApplySorting(IQueryable<Location> query, string sortBy, string sortDir)
    {
        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        return sortBy.ToLowerInvariant() switch
        {
            "address" => desc ? query.OrderByDescending(l => l.Address) : query.OrderBy(l => l.Address),
            "city" => desc ? query.OrderByDescending(l => l.City) : query.OrderBy(l => l.City),
            "country" => desc ? query.OrderByDescending(l => l.Country) : query.OrderBy(l => l.Country),
            "createdat" => desc ? query.OrderByDescending(l => l.CreatedAt) : query.OrderBy(l => l.CreatedAt),
            _ => desc ? query.OrderByDescending(l => l.Name) : query.OrderBy(l => l.Name),
        };
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LocationDto>> GetById(Guid id)
    {
        var location = await db.Locations.FindAsync(id);
        if (location is null) return NotFound();

        return Ok(new LocationDto(
            location.Id, location.Name, location.Address, location.City,
            location.Country, location.IsArchived, location.CreatedAt, location.UpdatedAt));
    }

    [HttpPost]
    public async Task<ActionResult<LocationDto>> Create(CreateLocationRequest request)
    {
        var location = new Location
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Address = request.Address,
            City = request.City,
            Country = request.Country
        };

        db.Locations.Add(location);
        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Created",
            EntityType: "Location",
            EntityId: location.Id.ToString(),
            EntityName: location.Name,
            Details: $"Created location \"{location.Name}\"",
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName));

        var dto = new LocationDto(
            location.Id, location.Name, location.Address, location.City,
            location.Country, location.IsArchived, location.CreatedAt, location.UpdatedAt);

        return CreatedAtAction(nameof(GetById), new { id = location.Id }, dto);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<LocationDto>> Update(Guid id, UpdateLocationRequest request)
    {
        var location = await db.Locations.FindAsync(id);
        if (location is null) return NotFound();

        location.Name = request.Name;
        location.Address = request.Address;
        location.City = request.City;
        location.Country = request.Country;
        location.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Updated",
            EntityType: "Location",
            EntityId: location.Id.ToString(),
            EntityName: location.Name,
            Details: $"Updated location \"{location.Name}\"",
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName));

        return Ok(new LocationDto(
            location.Id, location.Name, location.Address, location.City,
            location.Country, location.IsArchived, location.CreatedAt, location.UpdatedAt));
    }

    [HttpGet("{id:guid}/assets")]
    public async Task<ActionResult<List<LocationAssetDto>>> GetAssets(Guid id)
    {
        var location = await db.Locations.FindAsync(id);
        if (location is null) return NotFound();

        var assets = await db.Assets
            .Where(a => a.LocationId == id && !a.IsArchived)
            .Include(a => a.AssetType)
            .Include(a => a.AssignedPerson)
            .OrderBy(a => a.Name)
            .Select(a => new LocationAssetDto(
                a.Id,
                a.Name,
                a.AssetTag,
                a.AssetType.Name,
                a.Status.ToString(),
                a.AssignedPerson != null ? a.AssignedPerson.FullName : null))
            .ToListAsync();

        return Ok(assets);
    }

    [HttpGet("{id:guid}/people")]
    public async Task<ActionResult<List<LocationPersonDto>>> GetPeople(Guid id)
    {
        var location = await db.Locations.FindAsync(id);
        if (location is null) return NotFound();

        var people = await db.People
            .Where(p => p.LocationId == id && !p.IsArchived)
            .OrderBy(p => p.FullName)
            .Select(p => new LocationPersonDto(
                p.Id,
                p.FullName,
                p.Email,
                p.Department,
                p.JobTitle))
            .ToListAsync();

        return Ok(people);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Archive(Guid id)
    {
        var location = await db.Locations.FindAsync(id);
        if (location is null) return NotFound();

        location.IsArchived = true;
        location.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Archived",
            EntityType: "Location",
            EntityId: location.Id.ToString(),
            EntityName: location.Name,
            Details: $"Archived location \"{location.Name}\"",
            ActorId: currentUser.UserId,
            ActorName: currentUser.UserName));

        return NoContent();
    }
}
