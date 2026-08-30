package com.assetmanagement.api.dto

/**
 * Display name and email are managed by Microsoft Entra and re-applied from the
 * sign-in claims on every request, so the only profile setting a user can
 * actually change is the local one.
 */
data class UpdateProfileRequest(
    val themePreference: String? = null
)
