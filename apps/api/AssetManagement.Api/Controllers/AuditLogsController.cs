using System.Globalization;
using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using CsvHelper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Authorize]
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

        var query = ApplySorting(BuildFilteredQuery(entityType, action, search), sortBy, sortDir);

        var totalCount = await query.CountAsync();

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

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] string? entityType = null,
        [FromQuery] string? action = null,
        [FromQuery] string? search = null,
        [FromQuery] string sortBy = "timestamp",
        [FromQuery] string sortDir = "desc")
    {
        var query = ApplySorting(BuildFilteredQuery(entityType, action, search), sortBy, sortDir);

        var logs = await query.ToListAsync();

        var ms = new MemoryStream();
        await using var writer = new StreamWriter(ms, leaveOpen: true);
        await using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        csv.WriteField("Timestamp");
        csv.WriteField("ActorName");
        csv.WriteField("Action");
        csv.WriteField("EntityType");
        csv.WriteField("EntityName");
        csv.WriteField("Details");
        csv.WriteField("Source");
        await csv.NextRecordAsync();

        foreach (var l in logs)
        {
            csv.WriteField(l.Timestamp.ToString("yyyy-MM-dd HH:mm:ss"));
            csv.WriteField(l.ActorName);
            csv.WriteField(l.Action);
            csv.WriteField(l.EntityType);
            csv.WriteField(l.EntityName);
            csv.WriteField(l.Details);
            csv.WriteField(l.Source.ToString());
            await csv.NextRecordAsync();
        }

        await writer.FlushAsync();
        ms.Position = 0;

        return File(ms, "text/csv", "audit-log-export.csv");
    }

    private IQueryable<AssetManagement.Api.Models.AuditLog> BuildFilteredQuery(
        string? entityType, string? action, string? search)
    {
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

        return query;
    }

    private static IQueryable<AssetManagement.Api.Models.AuditLog> ApplySorting(
        IQueryable<AssetManagement.Api.Models.AuditLog> query, string sortBy, string sortDir)
    {
        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        return sortBy.ToLowerInvariant() switch
        {
            "action" => desc ? query.OrderByDescending(l => l.Action) : query.OrderBy(l => l.Action),
            "entitytype" => desc ? query.OrderByDescending(l => l.EntityType) : query.OrderBy(l => l.EntityType),
            "entityname" => desc ? query.OrderByDescending(l => l.EntityName) : query.OrderBy(l => l.EntityName),
            "actorname" => desc ? query.OrderByDescending(l => l.ActorName) : query.OrderBy(l => l.ActorName),
            _ => desc ? query.OrderByDescending(l => l.Timestamp) : query.OrderBy(l => l.Timestamp),
        };
    }
}
