package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.ChangePasswordRequest
import com.assetmanagement.api.dto.UpdateProfileRequest
import com.assetmanagement.api.dto.UserProfileResponse
import com.assetmanagement.api.repository.UserRepository
import com.assetmanagement.api.service.AuditChange
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
import org.springframework.http.ResponseEntity
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.*
import java.time.Instant

@RestController
@RequestMapping("/api/v1/profile")
class ProfileController(
    private val userRepository: UserRepository,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService,
    private val passwordEncoder: PasswordEncoder
) {

    @PutMapping
    fun updateProfile(@RequestBody request: UpdateProfileRequest): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val user = userRepository.findById(userId).orElse(null)
            ?: return ResponseEntity.status(401).build()
        if (!user.isActive) return ResponseEntity.status(401).build()

        if (userRepository.findByEmail(request.email)?.let { it.id != userId } == true)
            return ResponseEntity.status(409).body(mapOf("error" to "Email is already in use."))

        val changes = mutableListOf<AuditChange>()
        if (user.displayName != request.displayName) changes.add(AuditChange("DisplayName", user.displayName, request.displayName))
        if (user.email != request.email) changes.add(AuditChange("Email", user.email, request.email))
        if (user.themePreference != request.themePreference) changes.add(AuditChange("ThemePreference", user.themePreference, request.themePreference))

        user.displayName = request.displayName
        user.email = request.email
        user.themePreference = request.themePreference
        user.updatedAt = Instant.now()
        userRepository.save(user)

        if (changes.isNotEmpty()) {
            auditService.log(AuditEntry("Updated", "User", user.id.toString(), user.displayName,
                "Profile updated", user.id, user.displayName, changes))
        }

        val roles = user.userRoles.mapNotNull { it.role?.name }
        return ResponseEntity.ok(UserProfileResponse(user.id, user.username, user.displayName, user.email, roles, user.themePreference))
    }

    @PutMapping("/password")
    fun changePassword(@RequestBody request: ChangePasswordRequest): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val user = userRepository.findById(userId).orElse(null)
            ?: return ResponseEntity.status(401).build()
        if (!user.isActive) return ResponseEntity.status(401).build()

        if (!passwordEncoder.matches(request.currentPassword, user.passwordHash))
            return ResponseEntity.badRequest().body(mapOf("error" to "Current password is incorrect."))

        if (request.newPassword.length < 6)
            return ResponseEntity.badRequest().body(mapOf("error" to "Password must be at least 6 characters."))

        user.passwordHash = passwordEncoder.encode(request.newPassword)
        user.updatedAt = Instant.now()
        userRepository.save(user)

        auditService.log(AuditEntry("PasswordChanged", "User", user.id.toString(), user.displayName,
            "Password changed", user.id, user.displayName))

        return ResponseEntity.noContent().build()
    }
}
