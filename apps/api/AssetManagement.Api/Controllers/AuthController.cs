using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using AssetManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController(AppDbContext db, ITokenService tokenService) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var user = await db.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { error = "Invalid username or password." });

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var token = tokenService.GenerateToken(user, roles);

        return Ok(new LoginResponse(token, new UserProfileResponse(
            user.Id, user.Username, user.DisplayName, user.Email, roles, user.ThemePreference)));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserProfileResponse>> Me()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId is null || !Guid.TryParse(userId, out var id))
            return Unauthorized();

        var user = await db.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id && u.IsActive);

        if (user is null) return Unauthorized();

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        return Ok(new UserProfileResponse(
            user.Id, user.Username, user.DisplayName, user.Email, roles, user.ThemePreference));
    }
}
