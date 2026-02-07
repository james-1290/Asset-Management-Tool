using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using AssetManagement.Api.Models;
using AssetManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AssetTypesController(AppDbContext db, IAuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<AssetTypeDto>>> GetAll()
    {
        var types = await db.AssetTypes
            .Where(t => !t.IsArchived)
            .OrderBy(t => t.Name)
            .Select(t => new AssetTypeDto(
                t.Id, t.Name, t.Description,
                t.IsArchived, t.CreatedAt, t.UpdatedAt))
            .ToListAsync();

        return Ok(types);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AssetTypeDto>> GetById(Guid id)
    {
        var type = await db.AssetTypes.FindAsync(id);
        if (type is null) return NotFound();

        return Ok(new AssetTypeDto(
            type.Id, type.Name, type.Description,
            type.IsArchived, type.CreatedAt, type.UpdatedAt));
    }

    [HttpPost]
    public async Task<ActionResult<AssetTypeDto>> Create(CreateAssetTypeRequest request)
    {
        var type = new AssetType
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description
        };

        db.AssetTypes.Add(type);
        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Created",
            EntityType: "AssetType",
            EntityId: type.Id.ToString(),
            EntityName: type.Name,
            Details: $"Created asset type \"{type.Name}\""));

        var dto = new AssetTypeDto(
            type.Id, type.Name, type.Description,
            type.IsArchived, type.CreatedAt, type.UpdatedAt);

        return CreatedAtAction(nameof(GetById), new { id = type.Id }, dto);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AssetTypeDto>> Update(Guid id, UpdateAssetTypeRequest request)
    {
        var type = await db.AssetTypes.FindAsync(id);
        if (type is null) return NotFound();

        type.Name = request.Name;
        type.Description = request.Description;
        type.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Updated",
            EntityType: "AssetType",
            EntityId: type.Id.ToString(),
            EntityName: type.Name,
            Details: $"Updated asset type \"{type.Name}\""));

        return Ok(new AssetTypeDto(
            type.Id, type.Name, type.Description,
            type.IsArchived, type.CreatedAt, type.UpdatedAt));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Archive(Guid id)
    {
        var type = await db.AssetTypes.FindAsync(id);
        if (type is null) return NotFound();

        type.IsArchived = true;
        type.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Archived",
            EntityType: "AssetType",
            EntityId: type.Id.ToString(),
            EntityName: type.Name,
            Details: $"Archived asset type \"{type.Name}\""));

        return NoContent();
    }
}
