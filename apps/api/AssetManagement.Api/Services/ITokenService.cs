using AssetManagement.Api.Models;

namespace AssetManagement.Api.Services;

public interface ITokenService
{
    string GenerateToken(User user, IEnumerable<string> roles);
}
