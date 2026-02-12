package com.assetmanagement.api.dto

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
    val username: String,
    val displayName: String,
    val email: String,
    val password: String,
    val role: String
)

data class UpdateUserRequest(
    val displayName: String,
    val email: String,
    val role: String,
    val isActive: Boolean
)

data class ResetPasswordRequest(
    val newPassword: String
)

data class RoleDto(
    val id: UUID,
    val name: String,
    val description: String?
)
