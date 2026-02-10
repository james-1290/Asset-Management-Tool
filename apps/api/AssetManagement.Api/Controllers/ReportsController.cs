using System.Globalization;
using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using AssetManagement.Api.Models.Enums;
using CsvHelper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public class ReportsController(AppDbContext db) : ControllerBase
{
    [HttpGet("asset-summary")]
    public async Task<ActionResult<AssetSummaryReportDto>> GetAssetSummary(
        [FromQuery] string? format)
    {
        var totalAssets = await db.Assets.CountAsync(a => !a.IsArchived);
        var totalValue = await db.Assets
            .Where(a => !a.IsArchived && a.PurchaseCost != null)
            .SumAsync(a => a.PurchaseCost!.Value);

        var byStatus = await db.Assets
            .Where(a => !a.IsArchived)
            .GroupBy(a => a.Status)
            .Select(g => new StatusBreakdownItemDto(g.Key.ToString(), g.Count()))
            .ToListAsync();

        var typeGroups = await db.Assets
            .Where(a => !a.IsArchived)
            .GroupBy(a => a.AssetTypeId)
            .Select(g => new { AssetTypeId = g.Key, Count = g.Count() })
            .ToListAsync();

        var typeNames = await db.AssetTypes
            .Where(t => typeGroups.Select(g => g.AssetTypeId).Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, t => t.Name);

        var byType = typeGroups
            .Select(g => new AssetsByGroupItemDto(
                typeNames.GetValueOrDefault(g.AssetTypeId, "Unknown"), g.Count))
            .OrderByDescending(g => g.Count)
            .ToList();

        var locGroups = await db.Assets
            .Where(a => !a.IsArchived)
            .GroupBy(a => a.LocationId)
            .Select(g => new { LocationId = g.Key, Count = g.Count() })
            .ToListAsync();

        var locationIds = locGroups
            .Where(g => g.LocationId != null)
            .Select(g => g.LocationId!.Value)
            .ToList();

        var locationNames = await db.Locations
            .Where(l => locationIds.Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, l => l.Name);

        var byLocation = locGroups
            .Select(g => new AssetsByGroupItemDto(
                g.LocationId != null
                    ? locationNames.GetValueOrDefault(g.LocationId.Value, "Unknown")
                    : "Unassigned",
                g.Count))
            .OrderByDescending(g => g.Count)
            .ToList();

        var report = new AssetSummaryReportDto(totalAssets, totalValue, byStatus, byType, byLocation);

        if (format == "csv")
            return AssetSummaryCsv(report);

        return Ok(report);
    }

    [HttpGet("expiries")]
    public async Task<ActionResult<ExpiriesReportDto>> GetExpiries(
        [FromQuery] int days = 30,
        [FromQuery] string? format = null)
    {
        var now = DateTime.UtcNow.Date;
        var cutoff = now.AddDays(days);

        var warranties = await db.Assets
            .Where(a => !a.IsArchived
                && a.WarrantyExpiryDate != null
                && a.WarrantyExpiryDate.Value >= now
                && a.WarrantyExpiryDate.Value <= cutoff)
            .Include(a => a.AssetType)
            .Select(a => new {
                a.Id, a.Name, TypeName = a.AssetType.Name,
                ExpiryDate = a.WarrantyExpiryDate!.Value,
                Status = a.Status.ToString()
            })
            .ToListAsync();

        var certs = await db.Certificates
            .Where(c => !c.IsArchived
                && c.ExpiryDate != null
                && c.ExpiryDate.Value >= now
                && c.ExpiryDate.Value <= cutoff)
            .Include(c => c.CertificateType)
            .Select(c => new {
                c.Id, c.Name, TypeName = c.CertificateType.Name,
                ExpiryDate = c.ExpiryDate!.Value,
                Status = c.Status.ToString()
            })
            .ToListAsync();

        var licences = await db.Applications
            .Where(a => !a.IsArchived
                && a.ExpiryDate != null
                && a.ExpiryDate.Value >= now
                && a.ExpiryDate.Value <= cutoff)
            .Include(a => a.ApplicationType)
            .Select(a => new {
                a.Id, a.Name, TypeName = a.ApplicationType.Name,
                ExpiryDate = a.ExpiryDate!.Value,
                Status = a.Status.ToString()
            })
            .ToListAsync();

        var items = new List<ExpiryItemDto>();

        items.AddRange(warranties.Select(w => new ExpiryItemDto(
            w.Id, w.Name, "Warranty", w.TypeName, w.ExpiryDate,
            (w.ExpiryDate - now).Days, w.Status)));

        items.AddRange(certs.Select(c => new ExpiryItemDto(
            c.Id, c.Name, "Certificate", c.TypeName, c.ExpiryDate,
            (c.ExpiryDate - now).Days, c.Status)));

        items.AddRange(licences.Select(l => new ExpiryItemDto(
            l.Id, l.Name, "Licence", l.TypeName, l.ExpiryDate,
            (l.ExpiryDate - now).Days, l.Status)));

        items = items.OrderBy(i => i.ExpiryDate).ToList();

        var report = new ExpiriesReportDto(items, items.Count);

        if (format == "csv")
            return ExpiriesCsv(report);

        return Ok(report);
    }

    [HttpGet("licence-summary")]
    public async Task<ActionResult<LicenceSummaryReportDto>> GetLicenceSummary(
        [FromQuery] string? format = null)
    {
        var apps = await db.Applications
            .Where(a => !a.IsArchived)
            .GroupBy(a => a.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var total = apps.Sum(a => a.Count);
        int StatusCount(ApplicationStatus s) => apps.FirstOrDefault(a => a.Status == s)?.Count ?? 0;

        var totalSpend = await db.Applications
            .Where(a => !a.IsArchived && a.PurchaseCost != null)
            .SumAsync(a => a.PurchaseCost!.Value);

        var now = DateTime.UtcNow.Date;
        var cutoff = now.AddDays(30);

        var expiring = await db.Applications
            .Where(a => !a.IsArchived
                && a.ExpiryDate != null
                && a.ExpiryDate.Value >= now
                && a.ExpiryDate.Value <= cutoff)
            .Include(a => a.ApplicationType)
            .OrderBy(a => a.ExpiryDate)
            .Select(a => new {
                a.Id, a.Name, ApplicationTypeName = a.ApplicationType.Name,
                ExpiryDate = a.ExpiryDate!.Value, a.Status
            })
            .ToListAsync();

        var expiringItems = expiring.Select(a => new LicenceExpiryItemDto(
            a.Id, a.Name, a.ApplicationTypeName,
            a.ExpiryDate, (a.ExpiryDate - now).Days, a.Status.ToString()
        )).ToList();

        var report = new LicenceSummaryReportDto(
            total,
            StatusCount(ApplicationStatus.Active),
            StatusCount(ApplicationStatus.Expired),
            StatusCount(ApplicationStatus.PendingRenewal),
            StatusCount(ApplicationStatus.Suspended),
            totalSpend,
            expiringItems
        );

        if (format == "csv")
            return LicenceSummaryCsv(report);

        return Ok(report);
    }

    [HttpGet("assignments")]
    public async Task<ActionResult<AssignmentsReportDto>> GetAssignments(
        [FromQuery] string? format = null)
    {
        var people = await db.People
            .Where(p => !p.IsArchived)
            .Include(p => p.AssignedAssets.Where(a => !a.IsArchived))
            .Where(p => p.AssignedAssets.Any(a => !a.IsArchived))
            .OrderBy(p => p.FullName)
            .Select(p => new PersonAssignmentDto(
                p.Id,
                p.FullName,
                p.Email,
                p.AssignedAssets.Count(a => !a.IsArchived),
                p.AssignedAssets
                    .Where(a => !a.IsArchived)
                    .Select(a => new AssignedAssetBriefDto(a.Id, a.Name, a.AssetTag))
                    .ToList()
            ))
            .ToListAsync();

        var totalAssigned = people.Sum(p => p.AssignedAssetCount);

        var report = new AssignmentsReportDto(totalAssigned, people.Count, people);

        if (format == "csv")
            return AssignmentsCsv(report);

        return Ok(report);
    }

    [HttpGet("asset-lifecycle")]
    public async Task<ActionResult<AssetLifecycleReportDto>> GetAssetLifecycle(
        [FromQuery] string? format = null)
    {
        var now = DateTime.UtcNow;

        // Age buckets
        var purchaseDates = await db.Assets
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

        var byAge = buckets.Select(b => new AssetsByAgeBucketDto(
            b.Label,
            purchaseDates.Count(d => (now - d).TotalDays >= b.Min && (now - d).TotalDays < b.Max)
        )).ToList();

        // Past warranty
        var pastWarranty = await db.Assets
            .Where(a => !a.IsArchived
                && a.WarrantyExpiryDate != null
                && a.WarrantyExpiryDate.Value < now)
            .Include(a => a.AssetType)
            .OrderBy(a => a.WarrantyExpiryDate)
            .Take(50)
            .Select(a => new WarrantyExpiryItemDto(
                a.Id, a.Name, a.AssetTag, a.AssetType.Name,
                a.WarrantyExpiryDate!.Value,
                (int)(a.WarrantyExpiryDate!.Value - now).TotalDays
            ))
            .ToListAsync();

        // Oldest assets
        var oldest = await db.Assets
            .Where(a => !a.IsArchived && a.PurchaseDate != null)
            .Include(a => a.AssetType)
            .OrderBy(a => a.PurchaseDate)
            .Take(20)
            .Select(a => new {
                a.Id, a.Name, a.AssetTag, AssetTypeName = a.AssetType.Name,
                PurchaseDate = a.PurchaseDate!.Value
            })
            .ToListAsync();

        var oldestDtos = oldest.Select(a => new OldestAssetDto(
            a.Id, a.Name, a.AssetTag, a.AssetTypeName,
            a.PurchaseDate, (int)(now - a.PurchaseDate).TotalDays
        )).ToList();

        var report = new AssetLifecycleReportDto(byAge, pastWarranty, oldestDtos);

        if (format == "csv")
            return AssetLifecycleCsv(report);

        return Ok(report);
    }

    // --- CSV helpers ---

    private FileStreamResult AssetSummaryCsv(AssetSummaryReportDto report)
    {
        var ms = new MemoryStream();
        using var writer = new StreamWriter(ms, leaveOpen: true);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        csv.WriteField("Section"); csv.WriteField("Label"); csv.WriteField("Value");
        csv.NextRecord();

        csv.WriteField("Summary"); csv.WriteField("Total Assets"); csv.WriteField(report.TotalAssets);
        csv.NextRecord();
        csv.WriteField("Summary"); csv.WriteField("Total Value"); csv.WriteField(report.TotalValue.ToString("F2"));
        csv.NextRecord();

        foreach (var s in report.ByStatus)
        {
            csv.WriteField("By Status"); csv.WriteField(s.Status); csv.WriteField(s.Count);
            csv.NextRecord();
        }
        foreach (var t in report.ByType)
        {
            csv.WriteField("By Type"); csv.WriteField(t.Label); csv.WriteField(t.Count);
            csv.NextRecord();
        }
        foreach (var l in report.ByLocation)
        {
            csv.WriteField("By Location"); csv.WriteField(l.Label); csv.WriteField(l.Count);
            csv.NextRecord();
        }

        writer.Flush();
        ms.Position = 0;
        return File(ms, "text/csv", "asset-summary-report.csv");
    }

    private FileStreamResult ExpiriesCsv(ExpiriesReportDto report)
    {
        var ms = new MemoryStream();
        using var writer = new StreamWriter(ms, leaveOpen: true);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        csv.WriteField("Name"); csv.WriteField("Category"); csv.WriteField("Type");
        csv.WriteField("ExpiryDate"); csv.WriteField("DaysUntilExpiry"); csv.WriteField("Status");
        csv.NextRecord();

        foreach (var item in report.Items)
        {
            csv.WriteField(item.Name); csv.WriteField(item.Category); csv.WriteField(item.TypeName);
            csv.WriteField(item.ExpiryDate.ToString("yyyy-MM-dd"));
            csv.WriteField(item.DaysUntilExpiry); csv.WriteField(item.Status);
            csv.NextRecord();
        }

        writer.Flush();
        ms.Position = 0;
        return File(ms, "text/csv", "expiries-report.csv");
    }

    private FileStreamResult LicenceSummaryCsv(LicenceSummaryReportDto report)
    {
        var ms = new MemoryStream();
        using var writer = new StreamWriter(ms, leaveOpen: true);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        csv.WriteField("Name"); csv.WriteField("Type"); csv.WriteField("ExpiryDate");
        csv.WriteField("DaysUntilExpiry"); csv.WriteField("Status");
        csv.NextRecord();

        foreach (var item in report.ExpiringSoon)
        {
            csv.WriteField(item.Name); csv.WriteField(item.ApplicationTypeName);
            csv.WriteField(item.ExpiryDate.ToString("yyyy-MM-dd"));
            csv.WriteField(item.DaysUntilExpiry); csv.WriteField(item.Status);
            csv.NextRecord();
        }

        writer.Flush();
        ms.Position = 0;
        return File(ms, "text/csv", "licence-summary-report.csv");
    }

    private FileStreamResult AssignmentsCsv(AssignmentsReportDto report)
    {
        var ms = new MemoryStream();
        using var writer = new StreamWriter(ms, leaveOpen: true);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        csv.WriteField("Person"); csv.WriteField("Email"); csv.WriteField("AssetCount");
        csv.WriteField("AssignedAssets");
        csv.NextRecord();

        foreach (var p in report.People)
        {
            csv.WriteField(p.FullName); csv.WriteField(p.Email);
            csv.WriteField(p.AssignedAssetCount);
            csv.WriteField(string.Join("; ", p.Assets.Select(a => $"{a.Name} ({a.AssetTag})")));
            csv.NextRecord();
        }

        writer.Flush();
        ms.Position = 0;
        return File(ms, "text/csv", "assignments-report.csv");
    }

    private FileStreamResult AssetLifecycleCsv(AssetLifecycleReportDto report)
    {
        var ms = new MemoryStream();
        using var writer = new StreamWriter(ms, leaveOpen: true);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        csv.WriteField("Section"); csv.WriteField("Name"); csv.WriteField("AssetTag");
        csv.WriteField("Type"); csv.WriteField("Date"); csv.WriteField("Days");
        csv.NextRecord();

        foreach (var b in report.ByAge)
        {
            csv.WriteField("Age Bucket"); csv.WriteField(b.Bucket); csv.WriteField("");
            csv.WriteField(""); csv.WriteField(""); csv.WriteField(b.Count);
            csv.NextRecord();
        }
        foreach (var a in report.OldestAssets)
        {
            csv.WriteField("Oldest Assets"); csv.WriteField(a.Name); csv.WriteField(a.AssetTag);
            csv.WriteField(a.AssetTypeName); csv.WriteField(a.PurchaseDate.ToString("yyyy-MM-dd"));
            csv.WriteField(a.AgeDays);
            csv.NextRecord();
        }
        foreach (var w in report.PastWarranty)
        {
            csv.WriteField("Past Warranty"); csv.WriteField(w.Name); csv.WriteField(w.AssetTag);
            csv.WriteField(w.AssetTypeName); csv.WriteField(w.WarrantyExpiryDate.ToString("yyyy-MM-dd"));
            csv.WriteField(w.DaysUntilExpiry);
            csv.NextRecord();
        }

        writer.Flush();
        ms.Position = 0;
        return File(ms, "text/csv", "asset-lifecycle-report.csv");
    }
}
