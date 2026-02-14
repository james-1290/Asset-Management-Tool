package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.User
import com.assetmanagement.api.model.UserRole
import com.assetmanagement.api.repository.RoleRepository
import com.assetmanagement.api.repository.UserRepository
import com.assetmanagement.api.repository.UserRoleRepository
import com.assetmanagement.api.service.*
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.crypto.password.PasswordEncoder
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.*
import java.net.URI
import java.time.Instant
import java.util.*

@RestController
@RequestMapping("/api/v1/users")
class UsersController(
    private val userRepository: UserRepository,
    private val roleRepository: RoleRepository,
    private val userRoleRepository: UserRoleRepository,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService,
    private val passwordEncoder: PasswordEncoder
) {
    private fun isAdmin(): Boolean =
        SecurityContextHolder.getContext().authentication?.authorities?.any { it.authority == "ROLE_Admin" } == true

    private fun toDetailDto(u: User): UserDetailDto =
        UserDetailDto(u.id, u.username, u.displayName, u.email, u.isActive,
            u.userRoles.mapNotNull { it.role?.name }, u.createdAt, u.authProvider)

    @GetMapping
    @PreAuthorize("hasRole('Admin')")
    fun getAll(@RequestParam(defaultValue = "false") includeInactive: Boolean): ResponseEntity<List<UserDetailDto>> {
        val users = userRepository.findAll()
            .filter { if (!includeInactive || !isAdmin()) it.isActive else true }
            .sortedBy { it.displayName }
            .map { toDetailDto(it) }
        return ResponseEntity.ok(users)
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('Admin')")
    fun getById(@PathVariable id: UUID): ResponseEntity<UserDetailDto> {
        val user = userRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(toDetailDto(user))
    }

    @PostMapping
    @PreAuthorize("hasRole('Admin')")
    fun create(@Valid @RequestBody request: CreateUserRequest): ResponseEntity<Any> {
        if (userRepository.existsByUsername(request.username)) return ResponseEntity.status(409).body(mapOf("error" to "Username is already taken."))
        if (userRepository.existsByEmail(request.email)) return ResponseEntity.status(409).body(mapOf("error" to "Email is already in use."))
        if (request.password.length < 8) return ResponseEntity.badRequest().body(mapOf("error" to "Password must be at least 8 characters."))
        val role = roleRepository.findByName(request.role) ?: return ResponseEntity.badRequest().body(mapOf("error" to "Role '${request.role}' not found."))

        val user = User(username = request.username, displayName = request.displayName, email = request.email,
            passwordHash = passwordEncoder.encode(request.password))
        userRepository.save(user)
        userRoleRepository.save(UserRole(userId = user.id, roleId = role.id))

        auditService.log(AuditEntry("Created", "User", user.id.toString(), user.displayName,
            "User created with role ${request.role}", currentUserService.userId, currentUserService.userName))

        return ResponseEntity.created(URI("/api/v1/users/${user.id}"))
            .body(toDetailDto(user.apply { userRoles = mutableListOf() }).copy(roles = listOf(request.role)))
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('Admin')")
    fun update(@PathVariable id: UUID, @Valid @RequestBody request: UpdateUserRequest): ResponseEntity<Any> {
        val user = userRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()

        val isSsoUser = user.authProvider != "LOCAL"

        // For SSO users, only role changes are allowed — displayName, email, active are managed by the identity provider
        if (isSsoUser) {
            if (request.displayName != user.displayName || request.email != user.email || request.isActive != user.isActive) {
                return ResponseEntity.badRequest().body(mapOf(
                    "error" to "Display name, email, and active status are managed by the identity provider for SSO users. Only role can be changed."
                ))
            }
        }

        if (userRepository.findByEmail(request.email)?.let { it.id != id } == true)
            return ResponseEntity.status(409).body(mapOf("error" to "Email is already in use."))

        val changes = mutableListOf<AuditChange>()
        if (user.displayName != request.displayName) changes.add(AuditChange("DisplayName", user.displayName, request.displayName))
        if (user.email != request.email) changes.add(AuditChange("Email", user.email, request.email))
        if (user.isActive != request.isActive) changes.add(AuditChange("IsActive", user.isActive.toString(), request.isActive.toString()))

        user.displayName = request.displayName; user.email = request.email; user.isActive = request.isActive; user.updatedAt = Instant.now()

        val newRole = roleRepository.findByName(request.role) ?: return ResponseEntity.badRequest().body(mapOf("error" to "Role '${request.role}' not found."))
        val currentRoles = userRoleRepository.findByUserId(user.id)
        val currentRole = currentRoles.firstOrNull()
        if (currentRole == null || currentRole.roleId != newRole.id) {
            if (currentRole != null) {
                changes.add(AuditChange("Role", currentRole.role?.name ?: "", request.role))
                userRoleRepository.deleteByUserIdAndRoleId(user.id, currentRole.roleId)
            }
            userRoleRepository.save(UserRole(userId = user.id, roleId = newRole.id))
        }
        userRepository.save(user)

        if (changes.isNotEmpty()) {
            auditService.log(AuditEntry("Updated", "User", user.id.toString(), user.displayName,
                "User updated", currentUserService.userId, currentUserService.userName, changes))
        }

        return ResponseEntity.ok(UserDetailDto(user.id, user.username, user.displayName, user.email, user.isActive,
            listOf(request.role), user.createdAt, user.authProvider))
    }

    @PutMapping("/{id}/password")
    @PreAuthorize("hasRole('Admin')")
    fun resetPassword(@PathVariable id: UUID, @Valid @RequestBody request: ResetPasswordRequest): ResponseEntity<Any> {
        val user = userRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        if (user.authProvider != "LOCAL")
            return ResponseEntity.badRequest().body(mapOf("error" to "Cannot reset password for SSO users."))
        if (request.newPassword.length < 8) return ResponseEntity.badRequest().body(mapOf("error" to "Password must be at least 8 characters."))
        user.passwordHash = passwordEncoder.encode(request.newPassword); user.updatedAt = Instant.now()
        userRepository.save(user)
        auditService.log(AuditEntry("PasswordReset", "User", user.id.toString(), user.displayName,
            "Password reset by admin", currentUserService.userId, currentUserService.userName))
        return ResponseEntity.noContent().build()
    }
}
