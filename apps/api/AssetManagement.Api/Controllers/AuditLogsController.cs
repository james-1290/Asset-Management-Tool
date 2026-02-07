using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuditLogsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResponse<AuditLogDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? entityType = null,
        [FromQuery] string? action = null,
        [FromQuery] string? search = null,
        [FromQuery] string sortBy = "timestamp",
        [FromQuery] string sortDir = "desc")
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityType))
            query = query.Where(l => l.EntityType == entityType);

        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(l => l.Action == action);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(l =>
                (l.Details != null && EF.Functions.ILike(l.Details, $"%{search}%")) ||
                EF.Functions.ILike(l.ActorName, $"%{search}%") ||
                (l.EntityName != null && EF.Functions.ILike(l.EntityName, $"%{search}%")));

        var totalCount = await query.CountAsync();

        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        query = sortBy.ToLowerInvariant() switch
        {
            "action" => desc ? query.OrderByDescending(l => l.Action) : query.OrderBy(l => l.Action),
            "entitytype" => desc ? query.OrderByDescending(l => l.EntityType) : query.OrderBy(l => l.EntityType),
            "entityname" => desc ? query.OrderByDescending(l => l.EntityName) : query.OrderBy(l => l.EntityName),
            "actorname" => desc ? query.OrderByDescending(l => l.ActorName) : query.OrderBy(l => l.ActorName),
            _ => desc ? query.OrderByDescending(l => l.Timestamp) : query.OrderBy(l => l.Timestamp),
        };

        var logs = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new AuditLogDto(
                l.Id,
                l.ActorName,
                l.Action,
                l.EntityType,
                l.EntityId,
                l.EntityName,
                l.Source.ToString(),
                l.Details,
                l.Timestamp))
            .ToListAsync();

        return Ok(new PagedResponse<AuditLogDto>(logs, page, pageSize, totalCount));
    }
}
