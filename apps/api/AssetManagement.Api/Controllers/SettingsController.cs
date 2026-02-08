using System.Security.Claims;
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
[Route("api/v1/[controller]")]
public class SettingsController(AppDbContext db, IAuditService audit) : ControllerBase
{
    private string GetUserName() => User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
    private Guid? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return claim is not null && Guid.TryParse(claim, out var id) ? id : null;
    }

    private bool IsAdmin() => User.IsInRole("Admin");

    private async Task<string> GetSetting(string key, string defaultValue = "")
    {
        var setting = await db.SystemSettings.FindAsync(key);
        return setting?.Value ?? defaultValue;
    }

    private async Task SetSetting(string key, string value, string updatedBy)
    {
        var setting = await db.SystemSettings.FindAsync(key);
        if (setting is null)
        {
            db.SystemSettings.Add(new SystemSetting
            {
                Key = key,
                Value = value,
                UpdatedBy = updatedBy
            });
        }
        else
        {
            setting.Value = value;
            setting.UpdatedAt = DateTime.UtcNow;
            setting.UpdatedBy = updatedBy;
        }
    }

    [HttpGet("system")]
    public async Task<ActionResult<SystemSettingsDto>> GetSystem()
    {
        var dto = new SystemSettingsDto(
            await GetSetting("org.name", "My Organisation"),
            await GetSetting("org.currency", "GBP"),
            await GetSetting("org.dateFormat", "DD/MM/YYYY"),
            int.TryParse(await GetSetting("org.defaultPageSize", "25"), out var ps) ? ps : 25
        );
        return Ok(dto);
    }

    [HttpPut("system")]
    public async Task<ActionResult<SystemSettingsDto>> UpdateSystem(SystemSettingsDto request)
    {
        if (!IsAdmin()) return Forbid();

        var userName = GetUserName();
        await SetSetting("org.name", request.OrgName, userName);
        await SetSetting("org.currency", request.Currency, userName);
        await SetSetting("org.dateFormat", request.DateFormat, userName);
        await SetSetting("org.defaultPageSize", request.DefaultPageSize.ToString(), userName);
        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            "Updated", "SystemSettings", "system", "System Settings",
            "System settings updated", GetUserId(), userName));

        return Ok(request);
    }

    [HttpGet("alerts")]
    public async Task<ActionResult<AlertSettingsDto>> GetAlerts()
    {
        if (!IsAdmin()) return Forbid();

        var dto = new AlertSettingsDto(
            (await GetSetting("alerts.warranty.enabled", "true")) == "true",
            (await GetSetting("alerts.certificate.enabled", "true")) == "true",
            (await GetSetting("alerts.licence.enabled", "true")) == "true",
            await GetSetting("alerts.thresholds", "90,30,14,7"),
            await GetSetting("alerts.smtp.host"),
            int.TryParse(await GetSetting("alerts.smtp.port", "587"), out var port) ? port : 587,
            await GetSetting("alerts.smtp.username"),
            await GetSetting("alerts.smtp.password"),
            await GetSetting("alerts.smtp.fromAddress"),
            await GetSetting("alerts.slack.webhookUrl"),
            await GetSetting("alerts.recipients")
        );
        return Ok(dto);
    }

    [HttpPut("alerts")]
    public async Task<ActionResult<AlertSettingsDto>> UpdateAlerts(AlertSettingsDto request)
    {
        if (!IsAdmin()) return Forbid();

        var userName = GetUserName();
        await SetSetting("alerts.warranty.enabled", request.WarrantyEnabled.ToString().ToLower(), userName);
        await SetSetting("alerts.certificate.enabled", request.CertificateEnabled.ToString().ToLower(), userName);
        await SetSetting("alerts.licence.enabled", request.LicenceEnabled.ToString().ToLower(), userName);
        await SetSetting("alerts.thresholds", request.Thresholds, userName);
        await SetSetting("alerts.smtp.host", request.SmtpHost, userName);
        await SetSetting("alerts.smtp.port", request.SmtpPort.ToString(), userName);
        await SetSetting("alerts.smtp.username", request.SmtpUsername, userName);
        await SetSetting("alerts.smtp.password", request.SmtpPassword, userName);
        await SetSetting("alerts.smtp.fromAddress", request.SmtpFromAddress, userName);
        await SetSetting("alerts.slack.webhookUrl", request.SlackWebhookUrl, userName);
        await SetSetting("alerts.recipients", request.Recipients, userName);
        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            "Updated", "AlertSettings", "alerts", "Alert Settings",
            "Alert settings updated", GetUserId(), userName));

        return Ok(request);
    }
}
