using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public class NotificationsController(AppDbContext db) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<ActionResult<NotificationSummary>> GetSummary()
    {
        // Read alert threshold to determine lookahead window
        var thresholdSetting = await db.SystemSettings.FindAsync("alerts.thresholds");
        var thresholdStr = thresholdSetting?.Value ?? "90,30,14,7";

        var maxDays = 90; // default
        foreach (var part in thresholdStr.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (int.TryParse(part, out var days) && days > maxDays)
                maxDays = days;
        }

        var cutoff = DateTime.UtcNow.AddDays(maxDays);
        var now = DateTime.UtcNow;

        // Warranties (assets with warranty expiry within window)
        var warrantyItems = await db.Assets
            .Where(a => !a.IsArchived &&
                a.WarrantyExpiryDate != null &&
                a.WarrantyExpiryDate >= now &&
                a.WarrantyExpiryDate <= cutoff)
            .OrderBy(a => a.WarrantyExpiryDate)
            .Take(5)
            .Select(a => new NotificationItem(a.Id.ToString(), a.Name, a.WarrantyExpiryDate!.Value))
            .ToListAsync();

        var warrantyCount = await db.Assets
            .CountAsync(a => !a.IsArchived &&
                a.WarrantyExpiryDate != null &&
                a.WarrantyExpiryDate >= now &&
                a.WarrantyExpiryDate <= cutoff);

        // Certificates with expiry within window
        var certItems = await db.Certificates
            .Where(c => !c.IsArchived &&
                c.ExpiryDate != null &&
                c.ExpiryDate >= now &&
                c.ExpiryDate <= cutoff)
            .OrderBy(c => c.ExpiryDate)
            .Take(5)
            .Select(c => new NotificationItem(c.Id.ToString(), c.Name, c.ExpiryDate!.Value))
            .ToListAsync();

        var certCount = await db.Certificates
            .CountAsync(c => !c.IsArchived &&
                c.ExpiryDate != null &&
                c.ExpiryDate >= now &&
                c.ExpiryDate <= cutoff);

        // Applications/licences with expiry within window
        var licenceItems = await db.Applications
            .Where(a => !a.IsArchived &&
                a.ExpiryDate != null &&
                a.ExpiryDate >= now &&
                a.ExpiryDate <= cutoff)
            .OrderBy(a => a.ExpiryDate)
            .Take(5)
            .Select(a => new NotificationItem(a.Id.ToString(), a.Name, a.ExpiryDate!.Value))
            .ToListAsync();

        var licenceCount = await db.Applications
            .CountAsync(a => !a.IsArchived &&
                a.ExpiryDate != null &&
                a.ExpiryDate >= now &&
                a.ExpiryDate <= cutoff);

        var totalCount = warrantyCount + certCount + licenceCount;

        return Ok(new NotificationSummary(
            totalCount,
            new NotificationGroup(warrantyCount, warrantyItems),
            new NotificationGroup(certCount, certItems),
            new NotificationGroup(licenceCount, licenceItems)));
    }
}
