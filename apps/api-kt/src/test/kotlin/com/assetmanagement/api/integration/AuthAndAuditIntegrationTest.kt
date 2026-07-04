package com.assetmanagement.api.integration

import com.assetmanagement.api.repository.AuditLogRepository
import com.assetmanagement.api.repository.UserRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import java.time.Instant

class AuthAndAuditIntegrationTest @Autowired constructor(
    private val userRepository: UserRepository,
    private val auditLogRepository: AuditLogRepository,
) : AbstractIntegrationTest() {

    @Test
    fun `flyway migrates from clean and seeds the admin user`() {
        // The context only boots if Flyway applied all migrations and ddl-auto=validate
        // matched the entity mappings against the migrated schema. The seeder then ran:
        val admin = userRepository.findByUsername("admin")
        assertNotNull(admin, "admin user should be seeded on a clean database")
        assertEquals("LOCAL", admin!!.authProvider)
    }

    @Test
    fun `login returns a token and protected endpoints require it`() {
        val login = postJson("/api/v1/auth/login", """{"username":"admin","password":"admin123"}""")
        assertEquals(HttpStatus.OK, login.statusCode)
        assertTrue(login.body!!.contains("\"token\""))

        val token = loginAsAdmin()
        val withToken = getWithToken("/api/v1/locations", token)
        assertEquals(HttpStatus.OK, withToken.statusCode)

        val noToken = getWithToken("/api/v1/locations", null)
        assertTrue(
            noToken.statusCode == HttpStatus.UNAUTHORIZED || noToken.statusCode == HttpStatus.FORBIDDEN,
            "unauthenticated request should be rejected, was ${noToken.statusCode}",
        )
    }

    @Test
    fun `bad credentials are rejected with 401`() {
        val resp = postJson("/api/v1/auth/login", """{"username":"admin","password":"wrong"}""")
        assertEquals(HttpStatus.UNAUTHORIZED, resp.statusCode)
    }

    @Test
    fun `a token issued before tokenInvalidatedAt is rejected`() {
        val token = loginAsAdmin()
        // Sanity: the fresh token works.
        assertEquals(HttpStatus.OK, getWithToken("/api/v1/locations", token).statusCode)

        // Invalidate all tokens issued up to now (e.g. what a logout-everywhere / password
        // change does). Push the cutoff a few seconds ahead of the token's (second-precision) iat.
        val admin = userRepository.findByUsername("admin")!!
        admin.tokenInvalidatedAt = Instant.now().plusSeconds(5)
        userRepository.save(admin)

        val after = getWithToken("/api/v1/locations", token)
        assertEquals(HttpStatus.UNAUTHORIZED, after.statusCode)

        // Clean up so other tests' fresh logins keep working.
        admin.tokenInvalidatedAt = null
        userRepository.save(admin)
    }

    @Test
    fun `write operations emit an audit-log entry`() {
        val token = loginAsAdmin()
        val name = "IT Location ${System.nanoTime()}"
        val create = postJson("/api/v1/locations", """{"name":"$name"}""", token)
        assertEquals(HttpStatus.CREATED, create.statusCode)

        val logged = auditLogRepository.findAll().any {
            it.entityType == "Location" && it.action == "Created" && it.entityName == name
        }
        assertTrue(logged, "a Created/Location audit entry should be written for \"$name\"")
    }
}
