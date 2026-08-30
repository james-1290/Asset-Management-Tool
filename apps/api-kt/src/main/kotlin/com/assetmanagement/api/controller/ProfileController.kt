package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.UpdateProfileRequest
import com.assetmanagement.api.dto.UserProfileResponse
import com.assetmanagement.api.repository.UserRepository
import com.assetmanagement.api.service.AuditChange
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant

/**
 * The user's own settings.
 *
 * Display name and email are **not** editable here. They come from Microsoft
 * Entra and are re-applied from the sign-in claims on every request, so letting
 * a user edit them would show a change that silently reverted moments later.
 * What remains is genuinely local: the theme preference.
 */
@RestController
@RequestMapping("/api/v1/profile")
class ProfileController(
    private val userRepository: UserRepository,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService
) {

    @PutMapping
    @Transactional
    fun updateProfile(@Valid @RequestBody request: UpdateProfileRequest): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val user = userRepository.findWithRolesById(userId)
            ?: return ResponseEntity.status(401).build()
        if (!user.isActive) return ResponseEntity.status(401).build()

        val changes = mutableListOf<AuditChange>()
        if (user.themePreference != request.themePreference) {
            changes.add(AuditChange("ThemePreference", user.themePreference, request.themePreference))
        }

        user.themePreference = request.themePreference
        user.updatedAt = Instant.now()
        userRepository.save(user)

        if (changes.isNotEmpty()) {
            auditService.log(AuditEntry("Updated", "User", user.id.toString(), user.displayName,
                "Profile updated", user.id, user.displayName, changes))
        }

        val roles = user.userRoles.mapNotNull { it.role?.name }
        return ResponseEntity.ok(
            UserProfileResponse(
                user.id, user.username, user.displayName, user.email, roles,
                user.themePreference, user.authProvider
            )
        )
    }
}
