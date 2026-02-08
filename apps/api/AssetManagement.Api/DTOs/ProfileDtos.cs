namespace AssetManagement.Api.DTOs;

public record UpdateProfileRequest(
    string DisplayName,
    string Email,
    string? ThemePreference
);

public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword
);
