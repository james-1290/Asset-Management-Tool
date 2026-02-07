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
    public async Task<ActionResult<List<AuditLogDto>>> GetAll(
        [FromQuery] string? entityType,
        [FromQuery] string? action,
        [FromQuery] string? search)
    {
        var query = db.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityType))
            query = query.Where(l => l.EntityType == entityType);

        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(l => l.Action == action);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(l =>
                (l.Details != null && l.Details.Contains(search)) ||
                l.ActorName.Contains(search));

        var logs = await query
            .OrderByDescending(l => l.Timestamp)
            .Select(l => new AuditLogDto(
                l.Id,
                l.ActorName,
                l.Action,
                l.EntityType,
                l.EntityId,
                l.Source.ToString(),
                l.Details,
                l.Timestamp))
            .ToListAsync();

        return Ok(logs);
    }
}
