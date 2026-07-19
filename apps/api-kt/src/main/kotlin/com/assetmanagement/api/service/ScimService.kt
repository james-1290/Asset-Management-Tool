package com.assetmanagement.api.service

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.User
import com.assetmanagement.api.model.UserRole
import com.assetmanagement.api.repository.RoleRepository
import com.assetmanagement.api.repository.UserRepository
import com.assetmanagement.api.repository.UserRoleRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.*

@Service
@ConditionalOnProperty(name = ["scim.enabled"], havingValue = "true")
class ScimService(
    private val userRepository: UserRepository,
    private val roleRepository: RoleRepository,
    private val userRoleRepository: UserRoleRepository,
    private val auditService: AuditService,
    @Value("\${saml.default-role:User}") private val defaultRole: String
) {
    private val log = LoggerFactory.getLogger(ScimService::class.java)
    private val isoFormatter = DateTimeFormatter.ISO_INSTANT

    fun toScimUser(user: User, baseUrl: String): ScimUser {
        return ScimUser(
            id = user.id.toString(),
            externalId = user.externalId,
            userName = user.username,
            name = ScimName(formatted = user.displayName),
            emails = listOf(ScimEmail(value = user.email, type = "work", primary = true)),
            displayName = user.displayName,
            active = user.isActive,
            meta = ScimMeta(
                resourceType = "User",
                location = "$baseUrl/scim/v2/Users/${user.id}",
                created = isoFormatter.format(user.createdAt.atOffset(ZoneOffset.UTC)),
                lastModified = isoFormatter.format(user.updatedAt.atOffset(ZoneOffset.UTC))
            )
        )
    }

    fun listUsers(filter: String?, startIndex: Int, count: Int, baseUrl: String): ScimListResponse<ScimUser> {
        val users = if (filter != null) {
            parseAndFilter(filter)
        } else {
            userRepository.findAll()
        }

        // SCIM paging: startIndex is 1-based; count is the page size.
        val total = users.size
        val from = (startIndex - 1).coerceIn(0, total)
        val to = if (count <= 0) from else (from + count).coerceAtMost(total)
        val page = users.subList(from, to)
        val scimUsers = page.map { toScimUser(it, baseUrl) }
        return ScimListResponse(
            totalResults = total,
            startIndex = startIndex,
            itemsPerPage = scimUsers.size,
            resources = scimUsers
        )
    }

    fun getUser(id: UUID, baseUrl: String): ScimUser? {
        val user = userRepository.findById(id).orElse(null) ?: return null
        return toScimUser(user, baseUrl)
    }

    @Transactional
    fun createUser(scimUser: ScimUser, baseUrl: String): ScimUser {
        val email = scimUser.emails?.firstOrNull()?.value ?: scimUser.userName ?: ""
        val username = scimUser.userName ?: email
        // SCIM: creating a user that already exists must not silently duplicate.
        val existing = scimUser.externalId?.let { userRepository.findByExternalId(it) }
            ?: userRepository.findByUsername(username)
            ?: userRepository.findByEmail(email)
        if (existing != null) {
            throw IllegalStateException("User already exists: $username")
        }
        val displayName = scimUser.displayName
            ?: scimUser.name?.formatted
            ?: listOfNotNull(scimUser.name?.givenName, scimUser.name?.familyName).joinToString(" ").ifBlank { username }

        val user = User(
            username = username,
            email = email,
            displayName = displayName,
            passwordHash = null,
            authProvider = "SCIM",
            externalId = scimUser.externalId,
            isActive = scimUser.active
        )
        userRepository.save(user)

        val role = roleRepository.findByName(defaultRole)
        if (role != null) {
            userRoleRepository.save(UserRole(userId = user.id, roleId = role.id))
        }

        log.info("SCIM created user: id={}, username={}, externalId={}", user.id, username, scimUser.externalId)
        auditService.log(AuditEntry("Created", "User", user.id.toString(), user.displayName,
            "SCIM provisioned user $username", actorName = "SCIM"))
        return toScimUser(user, baseUrl)
    }

    @Transactional
    fun replaceUser(id: UUID, scimUser: ScimUser, baseUrl: String): ScimUser? {
        val user = userRepository.findById(id).orElse(null) ?: return null

        val email = scimUser.emails?.firstOrNull()?.value ?: scimUser.userName ?: user.email
        val displayName = scimUser.displayName
            ?: scimUser.name?.formatted
            ?: listOfNotNull(scimUser.name?.givenName, scimUser.name?.familyName).joinToString(" ").ifBlank { user.displayName }

        user.username = scimUser.userName ?: user.username
        user.email = email
        user.displayName = displayName
        user.isActive = scimUser.active
        user.externalId = scimUser.externalId ?: user.externalId
        user.updatedAt = Instant.now()
        userRepository.save(user)

        log.info("SCIM replaced user: id={}", id)
        auditService.log(AuditEntry("Updated", "User", user.id.toString(), user.displayName,
            "SCIM replaced user", actorName = "SCIM"))
        return toScimUser(user, baseUrl)
    }

    @Transactional
    fun patchUser(id: UUID, patchOp: ScimPatchOp, baseUrl: String): ScimUser? {
        val user = userRepository.findById(id).orElse(null) ?: return null

        for (op in patchOp.operations) {
            when (op.op.lowercase()) {
                "replace" -> applyReplace(user, op)
                "add" -> applyReplace(user, op) // add and replace behave the same for single-valued attrs
            }
        }

        user.updatedAt = Instant.now()
        userRepository.save(user)

        log.info("SCIM patched user: id={}", id)
        auditService.log(AuditEntry("Updated", "User", user.id.toString(), user.displayName,
            "SCIM patched user", actorName = "SCIM"))
        return toScimUser(user, baseUrl)
    }

    @Transactional
    fun deactivateUser(id: UUID): Boolean {
        val user = userRepository.findById(id).orElse(null) ?: return false
        user.isActive = false
        user.updatedAt = Instant.now()
        userRepository.save(user)
        log.info("SCIM deactivated user: id={}", id)
        auditService.log(AuditEntry("Deactivated", "User", user.id.toString(), user.displayName,
            "SCIM deactivated user", actorName = "SCIM"))
        return true
    }

    @Suppress("UNCHECKED_CAST")
    private fun applyReplace(user: User, op: ScimOperation) {
        val path = op.path
        val value = op.value

        if (path == null && value is Map<*, *>) {
            // Entra sends { "op": "Replace", "value": { "active": false } }
            val valueMap = value as Map<String, Any>
            valueMap["active"]?.let { user.isActive = it.toString().toBoolean() }
            valueMap["displayName"]?.let { user.displayName = it.toString() }
            valueMap["userName"]?.let { user.username = it.toString() }
            return
        }

        when (path?.lowercase()) {
            "active" -> user.isActive = value.toString().toBoolean()
            "displayname" -> user.displayName = value.toString()
            "username" -> user.username = value.toString()
            "externalid" -> user.externalId = value.toString()
            "emails[type eq \"work\"].value" -> user.email = value.toString()
            "name.formatted" -> user.displayName = value.toString()
        }
    }

    private fun parseAndFilter(filter: String): List<User> {
        // Handle simple SCIM filters: "userName eq \"value\"" and "externalId eq \"value\""
        val eqPattern = Regex("""(\w+)\s+eq\s+"([^"]+)"""")
        val match = eqPattern.find(filter) ?: return emptyList()

        val field = match.groupValues[1]
        val value = match.groupValues[2]

        return when (field) {
            "userName" -> listOfNotNull(userRepository.findByUsername(value) ?: userRepository.findByEmail(value))
            "externalId" -> listOfNotNull(userRepository.findByExternalId(value))
            else -> emptyList()
        }
    }
}
