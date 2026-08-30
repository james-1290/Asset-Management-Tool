package com.assetmanagement.api.dto

import java.time.Instant
import java.util.*

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

data class SetUserActiveRequest(
    val isActive: Boolean
)

data class RoleDto(
    val id: UUID,
    val name: String,
    val description: String?
)
