namespace AssetManagement.Api.DTOs;

public record UserDetailDto(
    Guid Id,
    string Username,
    string DisplayName,
    string Email,
    bool IsActive,
    List<string> Roles,
    DateTime CreatedAt
);

public record CreateUserRequest(
    string Username,
    string DisplayName,
    string Email,
    string Password,
    string Role
);

public record UpdateUserRequest(
    string DisplayName,
    string Email,
    string Role,
    bool IsActive
);

public record ResetPasswordRequest(
    string NewPassword
);

public record RoleDto(
    Guid Id,
    string Name,
    string? Description
);
