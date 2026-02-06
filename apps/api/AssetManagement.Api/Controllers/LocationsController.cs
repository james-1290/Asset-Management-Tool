using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using AssetManagement.Api.Models;
using AssetManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class LocationsController(AppDbContext db, IAuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<LocationDto>>> GetAll()
    {
        var locations = await db.Locations
            .Where(l => !l.IsArchived)
            .OrderBy(l => l.Name)
            .Select(l => new LocationDto(
                l.Id, l.Name, l.Address, l.City, l.Country,
                l.IsArchived, l.CreatedAt, l.UpdatedAt))
            .ToListAsync();

        return Ok(locations);
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
            Details: $"Created location \"{location.Name}\""));

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
            Details: $"Updated location \"{location.Name}\""));

        return Ok(new LocationDto(
            location.Id, location.Name, location.Address, location.City,
            location.Country, location.IsArchived, location.CreatedAt, location.UpdatedAt));
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
            Details: $"Archived location \"{location.Name}\""));

        return NoContent();
    }
}
