using System.Security.Claims;
using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using AssetManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public class ProfileController(AppDbContext db, IAuditService audit) : ControllerBase
{
    private Guid? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return claim is not null && Guid.TryParse(claim, out var id) ? id : null;
    }

    [HttpPut]
    public async Task<ActionResult<UserProfileResponse>> UpdateProfile(UpdateProfileRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var user = await db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
        if (user is null) return Unauthorized();

        // Check email uniqueness
        if (await db.Users.AnyAsync(u => u.Email == request.Email && u.Id != userId))
            return Conflict(new { error = "Email is already in use." });

        var changes = new List<AuditChange>();
        if (user.DisplayName != request.DisplayName)
            changes.Add(new AuditChange("DisplayName", user.DisplayName, request.DisplayName));
        if (user.Email != request.Email)
            changes.Add(new AuditChange("Email", user.Email, request.Email));
        if (user.ThemePreference != request.ThemePreference)
            changes.Add(new AuditChange("ThemePreference", user.ThemePreference, request.ThemePreference));

        user.DisplayName = request.DisplayName;
        user.Email = request.Email;
        user.ThemePreference = request.ThemePreference;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        if (changes.Count > 0)
        {
            await audit.LogAsync(new AuditEntry(
                "Updated", "User", user.Id.ToString(), user.DisplayName,
                "Profile updated", user.Id, user.DisplayName, changes));
        }

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        return Ok(new UserProfileResponse(
            user.Id, user.Username, user.DisplayName, user.Email, roles, user.ThemePreference));
    }

    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
        if (user is null) return Unauthorized();

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return BadRequest(new { error = "Current password is incorrect." });

        if (request.NewPassword.Length < 6)
            return BadRequest(new { error = "Password must be at least 6 characters." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            "PasswordChanged", "User", user.Id.ToString(), user.DisplayName,
            "Password changed", user.Id, user.DisplayName));

        return NoContent();
    }
}
