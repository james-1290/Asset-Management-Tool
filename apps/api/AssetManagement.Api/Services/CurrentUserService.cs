using System.Security.Claims;

namespace AssetManagement.Api.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public Guid? UserId
    {
        get
        {
            var sub = httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
            return sub is not null && Guid.TryParse(sub, out var id) ? id : null;
        }
    }

    public string UserName
    {
        get
        {
            return httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Name) ?? "System";
        }
    }
}
