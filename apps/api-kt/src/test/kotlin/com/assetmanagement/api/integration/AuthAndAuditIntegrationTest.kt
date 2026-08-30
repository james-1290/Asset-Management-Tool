package com.assetmanagement.api.integration

import com.assetmanagement.api.repository.AuditLogRepository
import com.assetmanagement.api.repository.RoleRepository
import com.assetmanagement.api.repository.UserRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus

class AuthAndAuditIntegrationTest @Autowired constructor(
    private val userRepository: UserRepository,
    private val roleRepository: RoleRepository,
    private val auditLogRepository: AuditLogRepository,
) : AbstractIntegrationTest() {

    @Test
    fun `flyway migrates from clean and seeds the roles, but no users`() {
        // The context only boots if Flyway applied all migrations and
        // ddl-auto=validate matched the entity mappings against the migrated
        // schema. The seeder then ran.
        assertNotNull(roleRepository.findByName("Admin"), "Admin role should be seeded")
        assertNotNull(roleRepository.findByName("Operator"), "Operator role should be seeded")
        assertNotNull(roleRepository.findByName("User"), "User role should be seeded")

        // No account is seeded any more: users exist only once they have signed
        // in with Entra, so there is no password-bearing account to inherit.
        assertNull(userRepository.findByUsername("admin"), "no local admin account should be seeded")
    }

    @Test
    fun `signing in provisions the user and grants access to protected endpoints`() {
        val session = loginAsAdmin()

        val authenticated = getAs("/api/v1/locations", session)
        assertEquals(HttpStatus.OK, authenticated.statusCode)

        val anonymous = getAs("/api/v1/locations", null)
        assertTrue(
            anonymous.statusCode == HttpStatus.UNAUTHORIZED || anonymous.statusCode == HttpStatus.FORBIDDEN,
            "unauthenticated request should be rejected, was ${anonymous.statusCode}",
        )

        // Provisioned from the Entra identity, not from a local account.
        val provisioned = userRepository.findByUsername("dev-admin@localhost")
        assertNotNull(provisioned, "signing in should JIT-provision the user")
        assertEquals("ENTRA", provisioned!!.authProvider)
    }

    @Test
    fun `a deactivated user is refused even with a valid session`() {
        val session = loginAsAdmin()
        assertEquals(HttpStatus.OK, getAs("/api/v1/locations", session).statusCode)

        val user = userRepository.findByUsername("dev-admin@localhost")!!
        user.isActive = false
        userRepository.save(user)
        try {
            val after = getAs("/api/v1/locations", session)
            // 403, not 401: the platform still signs them in fine, so bouncing
            // them back to sign in would loop. The body says which of the
            // refusal reasons applies, so the UI can explain it.
            assertEquals(HttpStatus.FORBIDDEN, after.statusCode, "a deactivated user must lose access immediately")
            assertTrue(
                after.body!!.contains("account_deactivated"),
                "the refusal should say the account is deactivated, not blame a missing role: ${after.body}"
            )
        } finally {
            user.isActive = true
            userRepository.save(user)
        }
    }

    @Test
    fun `write operations emit an audit-log entry`() {
        val session = loginAsAdmin()
        val name = "IT Location ${System.nanoTime()}"
        val create = postJson("/api/v1/locations", """{"name":"$name"}""", session)
        assertEquals(HttpStatus.CREATED, create.statusCode)

        val logged = auditLogRepository.findAll().any {
            it.entityType == "Location" && it.action == "Created" && it.entityName == name
        }
        assertTrue(logged, "a Created/Location audit entry should be written for \"$name\"")
    }
}
