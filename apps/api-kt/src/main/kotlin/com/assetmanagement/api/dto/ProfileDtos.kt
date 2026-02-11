package com.assetmanagement.api.dto

data class UpdateProfileRequest(
    val displayName: String,
    val email: String,
    val themePreference: String? = null
)

data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String
)
