using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using AssetManagement.Api.Models.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public class DashboardController(AppDbContext db) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary()
    {
        var totalAssets = await db.Assets.CountAsync(a => !a.IsArchived);
        var totalValue = await db.Assets
            .Where(a => !a.IsArchived && a.PurchaseCost != null)
            .SumAsync(a => a.PurchaseCost!.Value);

        return Ok(new DashboardSummaryDto(totalAssets, totalValue));
    }

    [HttpGet("status-breakdown")]
    public async Task<ActionResult<List<StatusBreakdownItemDto>>> GetStatusBreakdown()
    {
        var breakdown = await db.Assets
            .Where(a => !a.IsArchived)
            .GroupBy(a => a.Status)
            .Select(g => new StatusBreakdownItemDto(g.Key.ToString(), g.Count()))
            .ToListAsync();

        return Ok(breakdown);
    }

    [HttpGet("warranty-expiries")]
    public async Task<ActionResult<List<WarrantyExpiryItemDto>>> GetWarrantyExpiries(
        [FromQuery] int days = 30)
    {
        var now = DateTime.UtcNow.Date;
        var cutoff = now.AddDays(days);

        var raw = await db.Assets
            .Where(a => !a.IsArchived
                && a.WarrantyExpiryDate != null
                && a.WarrantyExpiryDate.Value >= now
                && a.WarrantyExpiryDate.Value <= cutoff)
            .Include(a => a.AssetType)
            .OrderBy(a => a.WarrantyExpiryDate)
            .Select(a => new {
                a.Id,
                a.Name,
                a.AssetTag,
                AssetTypeName = a.AssetType.Name,
                WarrantyExpiryDate = a.WarrantyExpiryDate!.Value
            })
            .ToListAsync();

        var expiries = raw.Select(a => new WarrantyExpiryItemDto(
            a.Id, a.Name, a.AssetTag, a.AssetTypeName,
            a.WarrantyExpiryDate,
            (a.WarrantyExpiryDate - now).Days
        )).ToList();

        return Ok(expiries);
    }

    [HttpGet("assets-by-type")]
    public async Task<ActionResult<List<AssetsByGroupItemDto>>> GetAssetsByType()
    {
        var groups = await db.Assets
            .Where(a => !a.IsArchived)
            .GroupBy(a => a.AssetTypeId)
            .Select(g => new { AssetTypeId = g.Key, Count = g.Count() })
            .ToListAsync();

        var typeNames = await db.AssetTypes
            .Where(t => groups.Select(g => g.AssetTypeId).Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, t => t.Name);

        var result = groups
            .Select(g => new AssetsByGroupItemDto(
                typeNames.GetValueOrDefault(g.AssetTypeId, "Unknown"),
                g.Count))
            .OrderByDescending(g => g.Count)
            .ToList();

        return Ok(result);
    }

    [HttpGet("assets-by-location")]
    public async Task<ActionResult<List<AssetsByGroupItemDto>>> GetAssetsByLocation()
    {
        var groups = await db.Assets
            .Where(a => !a.IsArchived)
            .GroupBy(a => a.LocationId)
            .Select(g => new { LocationId = g.Key, Count = g.Count() })
            .ToListAsync();

        var locationIds = groups
            .Where(g => g.LocationId != null)
            .Select(g => g.LocationId!.Value)
            .ToList();

        var locationNames = await db.Locations
            .Where(l => locationIds.Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, l => l.Name);

        var result = groups
            .Select(g => new AssetsByGroupItemDto(
                g.LocationId != null
                    ? locationNames.GetValueOrDefault(g.LocationId.Value, "Unknown")
                    : "Unassigned",
                g.Count))
            .OrderByDescending(g => g.Count)
            .ToList();

        return Ok(result);
    }

    [HttpGet("checked-out")]
    public async Task<ActionResult<List<CheckedOutAssetDto>>> GetCheckedOut()
    {
        var assets = await db.Assets
            .Where(a => !a.IsArchived && a.Status == AssetStatus.CheckedOut)
            .Include(a => a.AssignedPerson)
            .OrderByDescending(a => a.UpdatedAt)
            .Select(a => new CheckedOutAssetDto(
                a.Id,
                a.Name,
                a.AssetTag,
                a.AssignedPerson != null ? a.AssignedPerson.FullName : null,
                a.UpdatedAt))
            .ToListAsync();

        return Ok(assets);
    }

    [HttpGet("recently-added")]
    public async Task<ActionResult<List<RecentlyAddedAssetDto>>> GetRecentlyAdded(
        [FromQuery] int limit = 5)
    {
        var assets = await db.Assets
            .Where(a => !a.IsArchived)
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .Include(a => a.AssetType)
            .Select(a => new RecentlyAddedAssetDto(
                a.Id,
                a.Name,
                a.AssetTag,
                a.AssetType.Name,
                a.CreatedAt))
            .ToListAsync();

        return Ok(assets);
    }

    [HttpGet("assets-by-age")]
    public async Task<ActionResult<List<AssetsByAgeBucketDto>>> GetAssetsByAge()
    {
        var now = DateTime.UtcNow;

        var assets = await db.Assets
            .Where(a => !a.IsArchived && a.PurchaseDate != null)
            .Select(a => a.PurchaseDate!.Value)
            .ToListAsync();

        var buckets = new[]
        {
            new { Label = "<1 yr", Min = 0, Max = 365 },
            new { Label = "1–3 yr", Min = 365, Max = 365 * 3 },
            new { Label = "3–5 yr", Min = 365 * 3, Max = 365 * 5 },
            new { Label = "5+ yr", Min = 365 * 5, Max = int.MaxValue },
        };

        var result = buckets.Select(b => new AssetsByAgeBucketDto(
            b.Label,
            assets.Count(d => (now - d).TotalDays >= b.Min && (now - d).TotalDays < b.Max)
        )).ToList();

        return Ok(result);
    }

    [HttpGet("unassigned")]
    public async Task<ActionResult<List<UnassignedAssetDto>>> GetUnassigned()
    {
        var assets = await db.Assets
            .Where(a => !a.IsArchived
                && a.Status == AssetStatus.Available
                && a.AssignedPersonId == null)
            .Include(a => a.AssetType)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new UnassignedAssetDto(
                a.Id,
                a.Name,
                a.AssetTag,
                a.AssetType.Name))
            .ToListAsync();

        return Ok(assets);
    }

    [HttpGet("value-by-location")]
    public async Task<ActionResult<List<ValueByLocationDto>>> GetValueByLocation()
    {
        var groups = await db.Assets
            .Where(a => !a.IsArchived && a.PurchaseCost != null)
            .GroupBy(a => a.LocationId)
            .Select(g => new { LocationId = g.Key, TotalValue = g.Sum(a => a.PurchaseCost!.Value) })
            .ToListAsync();

        var locationIds = groups
            .Where(g => g.LocationId != null)
            .Select(g => g.LocationId!.Value)
            .ToList();

        var locationNames = await db.Locations
            .Where(l => locationIds.Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, l => l.Name);

        var result = groups
            .Select(g => new ValueByLocationDto(
                g.LocationId != null
                    ? locationNames.GetValueOrDefault(g.LocationId.Value, "Unknown")
                    : "Unassigned",
                g.TotalValue))
            .OrderByDescending(g => g.TotalValue)
            .ToList();

        return Ok(result);
    }

    [HttpGet("certificate-expiries")]
    public async Task<ActionResult<List<CertificateExpiryItemDto>>> GetCertificateExpiries(
        [FromQuery] int days = 30)
    {
        var now = DateTime.UtcNow.Date;
        var cutoff = now.AddDays(days);

        var raw = await db.Certificates
            .Where(c => !c.IsArchived
                && c.ExpiryDate != null
                && c.ExpiryDate.Value >= now
                && c.ExpiryDate.Value <= cutoff)
            .Include(c => c.CertificateType)
            .OrderBy(c => c.ExpiryDate)
            .Select(c => new {
                c.Id,
                c.Name,
                CertificateTypeName = c.CertificateType.Name,
                ExpiryDate = c.ExpiryDate!.Value,
                c.Status
            })
            .ToListAsync();

        var expiries = raw.Select(c => new CertificateExpiryItemDto(
            c.Id, c.Name, c.CertificateTypeName,
            c.ExpiryDate,
            (c.ExpiryDate - now).Days,
            c.Status.ToString()
        )).ToList();

        return Ok(expiries);
    }

    [HttpGet("certificate-summary")]
    public async Task<ActionResult<CertificateSummaryDto>> GetCertificateSummary()
    {
        var certs = await db.Certificates
            .Where(c => !c.IsArchived)
            .GroupBy(c => c.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var total = certs.Sum(c => c.Count);
        int StatusCount(CertificateStatus s) => certs.FirstOrDefault(c => c.Status == s)?.Count ?? 0;

        return Ok(new CertificateSummaryDto(
            total,
            StatusCount(CertificateStatus.Active),
            StatusCount(CertificateStatus.Expired),
            StatusCount(CertificateStatus.PendingRenewal),
            StatusCount(CertificateStatus.Revoked)
        ));
    }

    [HttpGet("licence-expiries")]
    public async Task<ActionResult<List<LicenceExpiryItemDto>>> GetLicenceExpiries(
        [FromQuery] int days = 30)
    {
        var now = DateTime.UtcNow.Date;
        var cutoff = now.AddDays(days);

        var raw = await db.Applications
            .Where(a => !a.IsArchived
                && a.ExpiryDate != null
                && a.ExpiryDate.Value >= now
                && a.ExpiryDate.Value <= cutoff)
            .Include(a => a.ApplicationType)
            .OrderBy(a => a.ExpiryDate)
            .Select(a => new {
                a.Id,
                a.Name,
                ApplicationTypeName = a.ApplicationType.Name,
                ExpiryDate = a.ExpiryDate!.Value,
                a.Status
            })
            .ToListAsync();

        var expiries = raw.Select(a => new LicenceExpiryItemDto(
            a.Id, a.Name, a.ApplicationTypeName,
            a.ExpiryDate,
            (a.ExpiryDate - now).Days,
            a.Status.ToString()
        )).ToList();

        return Ok(expiries);
    }

    [HttpGet("application-summary")]
    public async Task<ActionResult<ApplicationSummaryDto>> GetApplicationSummary()
    {
        var apps = await db.Applications
            .Where(a => !a.IsArchived)
            .GroupBy(a => a.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var total = apps.Sum(a => a.Count);
        int StatusCount(ApplicationStatus s) => apps.FirstOrDefault(a => a.Status == s)?.Count ?? 0;

        return Ok(new ApplicationSummaryDto(
            total,
            StatusCount(ApplicationStatus.Active),
            StatusCount(ApplicationStatus.Expired),
            StatusCount(ApplicationStatus.PendingRenewal),
            StatusCount(ApplicationStatus.Suspended)
        ));
    }
}
