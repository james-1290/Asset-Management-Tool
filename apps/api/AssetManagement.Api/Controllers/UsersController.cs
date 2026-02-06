using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class UsersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> GetAll()
    {
        var users = await db.Users
            .Where(u => u.IsActive)
            .OrderBy(u => u.DisplayName)
            .Select(u => new UserDto(
                u.Id, u.Username, u.DisplayName, u.Email, u.IsActive))
            .ToListAsync();

        return Ok(users);
    }
}
