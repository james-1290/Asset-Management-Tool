package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.UserProfileResponse
import com.assetmanagement.api.repository.UserRepository
import com.assetmanagement.api.service.CurrentUserService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * What remains of application-level auth: reporting who the caller is.
 *
 * Signing in and out belong to Azure App Service's built-in authentication
 * (`/.auth/login/aad`, `/.auth/logout`), which this application does not
 * implement — it only reads the identity the platform supplies.
 */
@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val userRepository: UserRepository,
    private val currentUserService: CurrentUserService
) {

    @GetMapping("/me")
    fun me(): ResponseEntity<Any> {
        val userId = currentUserService.userId
            ?: return ResponseEntity.status(401).build()

        val user = userRepository.findWithRolesById(userId)
            ?: return ResponseEntity.status(401).build()

        if (!user.isActive) return ResponseEntity.status(401).build()

        val roles = user.userRoles.mapNotNull { it.role?.name }
        return ResponseEntity.ok(UserProfileResponse(
            id = user.id,
            username = user.username,
            displayName = user.displayName,
            email = user.email,
            roles = roles,
            themePreference = user.themePreference,
            authProvider = user.authProvider
        ))
    }
}
