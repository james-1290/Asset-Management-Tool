package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.SetUserActiveRequest
import com.assetmanagement.api.dto.UserDetailDto
import com.assetmanagement.api.model.User
import com.assetmanagement.api.repository.RoleRepository
import com.assetmanagement.api.repository.UserRepository
import com.assetmanagement.api.repository.UserRoleRepository
import com.assetmanagement.api.service.AuditChange
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.*

/**
 * Read-only view of who has access, plus a local emergency revoke.
 *
 * Users are created by signing in (JIT-provisioned from the Entra identity), and
 * their name, email and **roles** come from Entra — roles are re-applied from
 * the `roles` claim on every request. Editing any of that here would be
 * overwritten within moments, so it isn't offered: access is granted and removed
 * by assigning app roles in Entra.
 *
 * Deactivation is the one local control kept. Entra assignment changes can take
 * time to propagate, and an administrator needs a way to cut off access to *this*
 * application immediately.
 */
@RestController
@RequestMapping("/api/v1/users")
class UsersController(
    private val userRepository: UserRepository,
    private val roleRepository: RoleRepository,
    private val userRoleRepository: UserRoleRepository,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService
) {
    private fun toDetailDto(u: User): UserDetailDto =
        UserDetailDto(u.id, u.username, u.displayName, u.email, u.isActive,
            u.userRoles.mapNotNull { it.role?.name }, u.createdAt, u.authProvider)

    @GetMapping
    @PreAuthorize("hasRole('Admin')")
    @Transactional(readOnly = true)
    fun getAll(@RequestParam(defaultValue = "false") includeInactive: Boolean): ResponseEntity<List<UserDetailDto>> {
        val users = userRepository.findAll()
            .filter { if (includeInactive) true else it.isActive }
            .sortedBy { it.displayName }
            .map { toDetailDto(it) }
        return ResponseEntity.ok(users)
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('Admin')")
    @Transactional(readOnly = true)
    fun getById(@PathVariable id: UUID): ResponseEntity<UserDetailDto> {
        val user = userRepository.findWithRolesById(id) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(toDetailDto(user))
    }

    /**
     * Immediately grants or revokes access to this application, independent of
     * Entra. A deactivated user is refused at sign-in even while they still hold
     * the app role.
     */
    @PutMapping("/{id}/active")
    @PreAuthorize("hasRole('Admin')")
    @Transactional
    fun setActive(@PathVariable id: UUID, @Valid @RequestBody request: SetUserActiveRequest): ResponseEntity<Any> {
        val user = userRepository.findWithRolesById(id) ?: return ResponseEntity.notFound().build()

        if (user.isActive == request.isActive) return ResponseEntity.ok(toDetailDto(user))

        // Guard against locking the whole organisation out of administration.
        if (!request.isActive) {
            val adminRole = roleRepository.findByName("Admin")
            if (adminRole != null && userRoleRepository.findByUserId(user.id).any { it.roleId == adminRole.id }) {
                val activeAdminCount = userRepository.findByIsActiveTrue().count { u ->
                    userRoleRepository.findByUserId(u.id).any { it.roleId == adminRole.id }
                }
                if (activeAdminCount <= 1) {
                    return ResponseEntity.badRequest().body(
                        mapOf("error" to "Cannot deactivate the last active administrator.")
                    )
                }
            }
        }

        user.isActive = request.isActive
        user.updatedAt = Instant.now()
        userRepository.save(user)

        auditService.log(AuditEntry(
            if (request.isActive) "Activated" else "Deactivated",
            "User", user.id.toString(), user.displayName,
            if (request.isActive) "User access restored" else "User access revoked",
            currentUserService.userId, currentUserService.userName,
            listOf(AuditChange("IsActive", (!request.isActive).toString(), request.isActive.toString()))
        ))

        return ResponseEntity.ok(toDetailDto(user))
    }
}
