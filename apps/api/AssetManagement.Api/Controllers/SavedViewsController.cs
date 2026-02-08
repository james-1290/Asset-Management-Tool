using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using AssetManagement.Api.Models;
using AssetManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/saved-views")]
public class SavedViewsController(AppDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<SavedViewDto>>> GetAll([FromQuery] string entityType)
    {
        if (string.IsNullOrWhiteSpace(entityType))
            return BadRequest("entityType is required");

        var userId = currentUser.UserId;
        if (userId is null) return Unauthorized();

        var views = await db.SavedViews
            .Where(v => v.UserId == userId.Value && v.EntityType == entityType)
            .OrderBy(v => v.Name)
            .Select(v => new SavedViewDto(
                v.Id, v.EntityType, v.Name, v.IsDefault,
                v.Configuration, v.CreatedAt, v.UpdatedAt))
            .ToListAsync();

        return Ok(views);
    }

    [HttpPost]
    public async Task<ActionResult<SavedViewDto>> Create([FromBody] CreateSavedViewRequest request)
    {
        var userId = currentUser.UserId;
        if (userId is null) return Unauthorized();

        var view = new SavedView
        {
            Id = Guid.NewGuid(),
            UserId = userId.Value,
            EntityType = request.EntityType,
            Name = request.Name,
            Configuration = request.Configuration,
        };

        db.SavedViews.Add(view);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { entityType = view.EntityType },
            new SavedViewDto(view.Id, view.EntityType, view.Name, view.IsDefault,
                view.Configuration, view.CreatedAt, view.UpdatedAt));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<SavedViewDto>> Update(Guid id, [FromBody] UpdateSavedViewRequest request)
    {
        var userId = currentUser.UserId;
        if (userId is null) return Unauthorized();

        var view = await db.SavedViews
            .FirstOrDefaultAsync(v => v.Id == id && v.UserId == userId.Value);

        if (view is null) return NotFound();

        view.Name = request.Name;
        view.Configuration = request.Configuration;
        view.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return Ok(new SavedViewDto(view.Id, view.EntityType, view.Name, view.IsDefault,
            view.Configuration, view.CreatedAt, view.UpdatedAt));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var userId = currentUser.UserId;
        if (userId is null) return Unauthorized();

        var view = await db.SavedViews
            .FirstOrDefaultAsync(v => v.Id == id && v.UserId == userId.Value);

        if (view is null) return NotFound();

        db.SavedViews.Remove(view);
        await db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPut("{id:guid}/default")]
    public async Task<ActionResult<SavedViewDto>> SetDefault(Guid id)
    {
        var userId = currentUser.UserId;
        if (userId is null) return Unauthorized();

        var view = await db.SavedViews
            .FirstOrDefaultAsync(v => v.Id == id && v.UserId == userId.Value);

        if (view is null) return NotFound();

        // Unset other defaults for the same user + entity type
        var otherDefaults = await db.SavedViews
            .Where(v => v.UserId == userId.Value && v.EntityType == view.EntityType && v.IsDefault && v.Id != id)
            .ToListAsync();

        foreach (var other in otherDefaults)
        {
            other.IsDefault = false;
            other.UpdatedAt = DateTime.UtcNow;
        }

        view.IsDefault = !view.IsDefault;
        view.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return Ok(new SavedViewDto(view.Id, view.EntityType, view.Name, view.IsDefault,
            view.Configuration, view.CreatedAt, view.UpdatedAt));
    }
}
