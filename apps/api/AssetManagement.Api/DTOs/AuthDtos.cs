namespace AssetManagement.Api.DTOs;

public record LoginRequest(string Username, string Password);

public record LoginResponse(string Token, UserProfileResponse User);

public record UserProfileResponse(
    Guid Id,
    string Username,
    string DisplayName,
    string Email,
    List<string> Roles,
    string? ThemePreference = null);
