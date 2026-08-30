package com.assetmanagement.api.security

/**
 * The authenticated caller, as placed in the Spring Security context.
 *
 * Identity comes from Microsoft Entra by way of Azure App Service's built-in
 * authentication; this is just the resolved local user behind it, carried so
 * that audit attribution and `CurrentUserService` have something cheap to read.
 */
data class AuthenticatedUser(
    val userId: String,
    val username: String,
    val displayName: String
)
