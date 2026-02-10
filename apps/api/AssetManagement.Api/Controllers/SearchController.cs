using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public class SearchController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<SearchResponse>> Search(
        [FromQuery] string? q = null,
        [FromQuery] int limit = 5)
    {
        limit = Math.Clamp(limit, 1, 20);

        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
        {
            return Ok(new SearchResponse([], [], [], [], []));
        }

        var pattern = $"%{q}%";

        var assets = await db.Assets
            .Where(a => !a.IsArchived && (
                EF.Functions.ILike(a.Name, pattern) ||
                EF.Functions.ILike(a.AssetTag, pattern)))
            .OrderBy(a => a.Name)
            .Take(limit)
            .Select(a => new SearchResultItem(a.Id.ToString(), a.Name, "Tag: " + a.AssetTag))
            .ToListAsync();

        var certificates = await db.Certificates
            .Where(c => !c.IsArchived &&
                EF.Functions.ILike(c.Name, pattern))
            .OrderBy(c => c.Name)
            .Take(limit)
            .Select(c => new SearchResultItem(c.Id.ToString(), c.Name, c.Issuer))
            .ToListAsync();

        var applications = await db.Applications
            .Where(a => !a.IsArchived &&
                EF.Functions.ILike(a.Name, pattern))
            .OrderBy(a => a.Name)
            .Take(limit)
            .Select(a => new SearchResultItem(a.Id.ToString(), a.Name, a.Publisher))
            .ToListAsync();

        var people = await db.People
            .Where(p => !p.IsArchived &&
                EF.Functions.ILike(p.FullName, pattern))
            .OrderBy(p => p.FullName)
            .Take(limit)
            .Select(p => new SearchResultItem(p.Id.ToString(), p.FullName, p.Email))
            .ToListAsync();

        var locations = await db.Locations
            .Where(l => !l.IsArchived &&
                EF.Functions.ILike(l.Name, pattern))
            .OrderBy(l => l.Name)
            .Take(limit)
            .Select(l => new SearchResultItem(l.Id.ToString(), l.Name, l.City))
            .ToListAsync();

        return Ok(new SearchResponse(assets, certificates, applications, people, locations));
    }
}
