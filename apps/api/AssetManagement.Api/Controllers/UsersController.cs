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
public class UsersController(AppDbContext db, IAuditService audit) : ControllerBase
{
    private string GetUserName() => User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
    private Guid? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return claim is not null && Guid.TryParse(claim, out var id) ? id : null;
    }

    private bool IsAdmin() => User.IsInRole("Admin");

    [HttpGet]
    public async Task<ActionResult<List<UserDetailDto>>> GetAll([FromQuery] bool includeInactive = false)
    {
        var query = db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .AsQueryable();

        if (!includeInactive || !IsAdmin())
            query = query.Where(u => u.IsActive);

        var users = await query
            .OrderBy(u => u.DisplayName)
            .Select(u => new UserDetailDto(
                u.Id, u.Username, u.DisplayName, u.Email, u.IsActive,
                u.UserRoles.Select(ur => ur.Role.Name).ToList(),
                u.CreatedAt))
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<UserDetailDto>> GetById(Guid id)
    {
        var user = await db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null) return NotFound();

        return Ok(new UserDetailDto(
            user.Id, user.Username, user.DisplayName, user.Email, user.IsActive,
            user.UserRoles.Select(ur => ur.Role.Name).ToList(),
            user.CreatedAt));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<UserDetailDto>> Create(CreateUserRequest request)
    {
        if (await db.Users.AnyAsync(u => u.Username == request.Username))
            return Conflict(new { error = "Username is already taken." });

        if (await db.Users.AnyAsync(u => u.Email == request.Email))
            return Conflict(new { error = "Email is already in use." });

        if (request.Password.Length < 6)
            return BadRequest(new { error = "Password must be at least 6 characters." });

        var role = await db.Roles.FirstOrDefaultAsync(r => r.Name == request.Role);
        if (role is null) return BadRequest(new { error = $"Role '{request.Role}' not found." });

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            DisplayName = request.DisplayName,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };
        db.Users.Add(user);
        db.Set<UserRole>().Add(new UserRole { UserId = user.Id, RoleId = role.Id });
        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            "Created", "User", user.Id.ToString(), user.DisplayName,
            $"User created with role {request.Role}", GetUserId(), GetUserName()));

        return CreatedAtAction(nameof(GetById), new { id = user.Id },
            new UserDetailDto(user.Id, user.Username, user.DisplayName, user.Email,
                user.IsActive, [request.Role], user.CreatedAt));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<UserDetailDto>> Update(Guid id, UpdateUserRequest request)
    {
        var user = await db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null) return NotFound();

        if (await db.Users.AnyAsync(u => u.Email == request.Email && u.Id != id))
            return Conflict(new { error = "Email is already in use." });

        var changes = new List<AuditChange>();
        if (user.DisplayName != request.DisplayName)
            changes.Add(new AuditChange("DisplayName", user.DisplayName, request.DisplayName));
        if (user.Email != request.Email)
            changes.Add(new AuditChange("Email", user.Email, request.Email));
        if (user.IsActive != request.IsActive)
            changes.Add(new AuditChange("IsActive", user.IsActive.ToString(), request.IsActive.ToString()));

        user.DisplayName = request.DisplayName;
        user.Email = request.Email;
        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        // Update role
        var currentRole = user.UserRoles.FirstOrDefault();
        var newRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == request.Role);
        if (newRole is null) return BadRequest(new { error = $"Role '{request.Role}' not found." });

        if (currentRole is null || currentRole.RoleId != newRole.Id)
        {
            if (currentRole is not null)
            {
                changes.Add(new AuditChange("Role", currentRole.Role.Name, request.Role));
                db.Set<UserRole>().Remove(currentRole);
            }
            db.Set<UserRole>().Add(new UserRole { UserId = user.Id, RoleId = newRole.Id });
        }

        await db.SaveChangesAsync();

        if (changes.Count > 0)
        {
            await audit.LogAsync(new AuditEntry(
                "Updated", "User", user.Id.ToString(), user.DisplayName,
                "User updated", GetUserId(), GetUserName(), changes));
        }

        return Ok(new UserDetailDto(
            user.Id, user.Username, user.DisplayName, user.Email, user.IsActive,
            [request.Role], user.CreatedAt));
    }

    [HttpPut("{id:guid}/password")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ResetPassword(Guid id, ResetPasswordRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();

        if (request.NewPassword.Length < 6)
            return BadRequest(new { error = "Password must be at least 6 characters." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            "PasswordReset", "User", user.Id.ToString(), user.DisplayName,
            "Password reset by admin", GetUserId(), GetUserName()));

        return NoContent();
    }
}
