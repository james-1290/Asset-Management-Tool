package com.assetmanagement.api.dto

import java.util.*

data class LoginRequest(
    val username: String,
    val password: String
)

data class LoginResponse(
    val token: String,
    val user: UserProfileResponse
)

data class UserProfileResponse(
    val id: UUID,
    val username: String,
    val displayName: String,
    val email: String,
    val roles: List<String>,
    val themePreference: String? = null
)
