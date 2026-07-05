package com.assetmanagement.api.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class UpdateProfileRequest(
    @field:NotBlank(message = "Display name is required")
    @field:Size(max = 200, message = "Display name must not exceed 200 characters")
    val displayName: String,
    @field:NotBlank(message = "Email is required")
    @field:Email(message = "Email must be a valid email address")
    @field:Size(max = 255, message = "Email must not exceed 255 characters")
    val email: String,
    val themePreference: String? = null
)

data class ChangePasswordRequest(
    @field:NotBlank(message = "Current password is required")
    val currentPassword: String,
    @field:NotBlank(message = "New password is required")
    val newPassword: String
)
