using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using AssetManagement.Api.Models;
using AssetManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class PeopleController(AppDbContext db, IAuditService audit) : ControllerBase
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
    public async Task<ActionResult<List<PersonDto>>> GetAll()
    {
        var people = await db.People
            .Where(p => !p.IsArchived)
            .Include(p => p.Location)
            .OrderBy(p => p.FullName)
            .Select(p => new PersonDto(
                p.Id, p.FullName, p.Email, p.Department, p.JobTitle,
                p.LocationId, p.Location != null ? p.Location.Name : null,
                p.IsArchived, p.CreatedAt, p.UpdatedAt))
            .ToListAsync();

        return Ok(people);
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
            Details: $"Created person \"{person.FullName}\""));

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
        var person = await db.People.FindAsync(id);
        if (person is null) return NotFound();

        if (request.LocationId.HasValue)
        {
            var location = await db.Locations.FindAsync(request.LocationId.Value);
            if (location is null || location.IsArchived)
                return BadRequest("Invalid location ID.");
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
            Details: $"Updated person \"{person.FullName}\""));

        await db.Entry(person).Reference(p => p.Location).LoadAsync();

        return Ok(new PersonDto(
            person.Id, person.FullName, person.Email, person.Department, person.JobTitle,
            person.LocationId, person.Location?.Name,
            person.IsArchived, person.CreatedAt, person.UpdatedAt));
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
            Details: $"Archived person \"{person.FullName}\""));

        return NoContent();
    }
}
