package com.assetmanagement.api.service

import com.assetmanagement.api.model.User
import com.assetmanagement.api.model.UserRole
import com.assetmanagement.api.repository.RoleRepository
import com.assetmanagement.api.repository.UserRepository
import com.assetmanagement.api.repository.UserRoleRepository
import com.assetmanagement.api.security.EasyAuthPrincipal
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

/**
 * Resolves an Azure App Service (Easy Auth) principal to a local `users` row,
 * provisioning it on first sign-in and keeping its profile and roles in step
 * with Entra on every subsequent request.
 *
 * Roles are authoritative in Entra: they come from app roles assigned on the
 * app registration (directly or via a group), arrive in the `roles` claim, and
 * are mirrored into `user_roles` so the rest of the app — `@PreAuthorize`,
 * audit attribution, the users list — keeps reading roles from the database
 * exactly as it does today.
 */
@Service
@ConditionalOnProperty(name = ["auth.easy-auth.enabled"], havingValue = "true")
class EasyAuthUserService(
    private val userRepository: UserRepository,
    private val roleRepository: RoleRepository,
    private val userRoleRepository: UserRoleRepository,
    @Value("\${auth.easy-auth.default-role:User}") private val defaultRole: String,
    @Value("\${auth.easy-auth.role-map:}") private val roleMapConfig: String
) {

    private val log = LoggerFactory.getLogger(EasyAuthUserService::class.java)

    companion object {
        const val AUTH_PROVIDER = "ENTRA"
    }

    /**
     * Entra app-role value -> local role name, parsed from
     * `EASY_AUTH_ROLE_MAP` as `entraRole:localRole,entraRole:localRole`.
     * Empty config means the app-role values are used as local role names
     * directly, which is the intended setup (app roles named Admin / Operator /
     * User to match the seeded roles).
     */
    private val roleMap: Map<String, String> by lazy {
        roleMapConfig.split(",")
            .mapNotNull { entry ->
                val parts = entry.split(":", limit = 2).map { it.trim() }
                if (parts.size == 2 && parts[0].isNotEmpty() && parts[1].isNotEmpty()) {
                    parts[0].lowercase() to parts[1]
                } else null
            }
            .toMap()
    }

    @Transactional
    fun resolve(principal: EasyAuthPrincipal): User? {
        val user = findOrCreate(principal) ?: return null
        if (!user.isActive) {
            log.warn("Easy Auth sign-in rejected: user {} is deactivated", user.id)
            return null
        }
        syncProfile(user, principal)
        syncRoles(user, principal)
        // Re-read with roles fetch-joined: open-in-view is off, so the caller
        // can't traverse the lazy collection once this transaction closes.
        return userRepository.findWithRolesById(user.id)
    }

    private fun findOrCreate(principal: EasyAuthPrincipal): User? {
        userRepository.findByExternalId(principal.externalId)?.let { return it }

        // Adopt an existing identity-provider-managed account that has no
        // external id yet — that's how SCIM-provisioned and previously-SAML
        // users carry over. LOCAL accounts are never auto-linked: doing so would
        // let anyone who can get an Entra mailbox at a matching address take
        // over the break-glass admin.
        if (principal.email.isNotBlank()) {
            userRepository.findByEmail(principal.email)?.let { existing ->
                if (existing.authProvider != "LOCAL" && existing.externalId == null) {
                    existing.externalId = principal.externalId
                    existing.authProvider = AUTH_PROVIDER
                    existing.updatedAt = Instant.now()
                    log.info("Linked existing {} user {} to Entra identity", existing.authProvider, existing.id)
                    return userRepository.save(existing)
                }
                log.warn(
                    "Easy Auth sign-in: email matches existing user {}, refusing auto-link (authProvider={}, externalId set={})",
                    existing.id, existing.authProvider, existing.externalId != null
                )
                return null
            }
        }

        val user = User(
            username = principal.username,
            email = principal.email,
            displayName = principal.displayName,
            passwordHash = null,
            authProvider = AUTH_PROVIDER,
            externalId = principal.externalId
        )
        userRepository.save(user)
        log.info("JIT provisioned Entra user: id={}", user.id)
        return user
    }

    private fun syncProfile(user: User, principal: EasyAuthPrincipal) {
        var changed = false
        if (principal.email.isNotBlank() && user.email != principal.email) {
            user.email = principal.email; changed = true
        }
        if (principal.displayName.isNotBlank() && user.displayName != principal.displayName) {
            user.displayName = principal.displayName; changed = true
        }
        if (changed) {
            user.updatedAt = Instant.now()
            userRepository.save(user)
        }
    }

    private fun syncRoles(user: User, principal: EasyAuthPrincipal) {
        val desired = desiredRoleNames(principal)
        val current = userRoleRepository.findByUserId(user.id)
        val currentNames = current.mapNotNull { it.role?.name }.toSet()

        // The common case is "nothing changed" on every request, so compare
        // before writing rather than rebuilding the assignments each time.
        if (currentNames == desired) return

        val desiredRoles = desired.mapNotNull { name ->
            roleRepository.findByName(name).also {
                if (it == null) log.warn("Easy Auth role '{}' has no matching local role — ignored", name)
            }
        }
        if (desiredRoles.isEmpty()) {
            log.warn("Easy Auth: no resolvable roles for user {} — leaving existing assignments untouched", user.id)
            return
        }

        current.forEach { userRoleRepository.deleteByUserIdAndRoleId(user.id, it.roleId) }
        desiredRoles.forEach { userRoleRepository.save(UserRole(userId = user.id, roleId = it.id)) }
        user.updatedAt = Instant.now()
        userRepository.save(user)

        log.info("Synced roles for user {} from Entra: {} -> {}", user.id, currentNames, desiredRoles.map { it.name })
    }

    private fun desiredRoleNames(principal: EasyAuthPrincipal): Set<String> {
        val mapped = principal.roles
            .map { roleMap[it.lowercase()] ?: it }
            .filter { it.isNotBlank() }
            .toSet()
        // A user assigned to the enterprise app but not to any app role still
        // gets in (Entra let them through); give them the read-only default
        // rather than an account with no permissions at all.
        return mapped.ifEmpty { setOf(defaultRole) }
    }
}
