package com.assetmanagement.api.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.util.*

data class LoginRequest(
    @field:NotBlank(message = "Username is required")
    @field:Size(max = 255, message = "Username must not exceed 255 characters")
    val username: String,

    @field:NotBlank(message = "Password is required")
    @field:Size(max = 500, message = "Password must not exceed 500 characters")
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
    val themePreference: String? = null,
    val authProvider: String = "LOCAL"
)

data class SsoConfigResponse(
    val ssoEnabled: Boolean,
    val ssoUrl: String? = null,
    val ssoLabel: String? = null
)
