package com.assetmanagement.api.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.Instant
import java.util.*

data class UserDto(
    val id: UUID,
    val username: String,
    val displayName: String,
    val email: String,
    val isActive: Boolean
)

data class UserDetailDto(
    val id: UUID,
    val username: String,
    val displayName: String,
    val email: String,
    val isActive: Boolean,
    val roles: List<String>,
    val createdAt: Instant,
    val authProvider: String = "LOCAL"
)

data class CreateUserRequest(
    @field:NotBlank(message = "Username is required")
    @field:Size(min = 1, max = 100, message = "Username must be between 1 and 100 characters")
    val username: String,

    @field:NotBlank(message = "Display name is required")
    @field:Size(max = 200, message = "Display name must not exceed 200 characters")
    val displayName: String,

    @field:NotBlank(message = "Email is required")
    @field:Email(message = "Email must be a valid email address")
    @field:Size(max = 255, message = "Email must not exceed 255 characters")
    val email: String,

    @field:NotBlank(message = "Password is required")
    @field:Size(min = 8, max = 500, message = "Password must be between 8 and 500 characters")
    val password: String,

    @field:NotBlank(message = "Role is required")
    val role: String
)

data class UpdateUserRequest(
    @field:NotBlank(message = "Display name is required")
    @field:Size(max = 200, message = "Display name must not exceed 200 characters")
    val displayName: String,

    @field:NotBlank(message = "Email is required")
    @field:Email(message = "Email must be a valid email address")
    @field:Size(max = 255, message = "Email must not exceed 255 characters")
    val email: String,

    @field:NotBlank(message = "Role is required")
    val role: String,

    val isActive: Boolean
)

data class ResetPasswordRequest(
    @field:NotBlank(message = "New password is required")
    @field:Size(min = 8, max = 500, message = "Password must be between 8 and 500 characters")
    val newPassword: String
)

data class RoleDto(
    val id: UUID,
    val name: String,
    val description: String?
)
