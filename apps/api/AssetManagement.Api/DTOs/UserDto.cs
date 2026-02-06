namespace AssetManagement.Api.DTOs;

public record UserDto(
    Guid Id,
    string Username,
    string DisplayName,
    string Email,
    bool IsActive
);
