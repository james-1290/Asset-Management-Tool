package com.assetmanagement.api.dto

import java.util.*

data class UserProfileResponse(
    val id: UUID,
    val username: String,
    val displayName: String,
    val email: String,
    val roles: List<String>,
    val themePreference: String? = null,
    val authProvider: String = "LOCAL"
)
