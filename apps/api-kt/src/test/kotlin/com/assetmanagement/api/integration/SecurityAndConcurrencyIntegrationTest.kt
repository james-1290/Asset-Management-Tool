package com.assetmanagement.api.integration

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus

/**
 * Covers the RBAC and optimistic-locking behaviours mandated by CLAUDE.md but
 * previously untested: a non-admin is denied admin endpoints, and a stale-version
 * update is rejected with 409.
 */
class SecurityAndConcurrencyIntegrationTest : AbstractIntegrationTest() {

    private fun field(body: String, name: String): String =
        Regex("\"$name\"\\s*:\\s*\"?([^\",}]+)\"?").find(body)?.groupValues?.get(1)
            ?: error("no \"$name\" in: $body")

    @Test
    fun `non-admin (Operator) is forbidden from admin-only endpoints`() {
        // Roles come from the Entra app role in the sign-in claims, so a test
        // picks its role by signing in as the matching identity rather than by
        // creating an account.
        val operator = signInWithCookie("operator")

        // GET /users is @PreAuthorize("hasRole('Admin')").
        val resp = getAs("/api/v1/users", operator)
        assertEquals(HttpStatus.FORBIDDEN, resp.statusCode, "Operator must be forbidden from the admin user list")
    }

    @Test
    fun `read-only User role can read domain data but cannot write`() {
        val token = signInWithCookie("user")

        // Reads are gated to Admin/Operator/User — the read-only role may read.
        assertEquals(HttpStatus.OK, getAs("/api/v1/assets?pageSize=1", token).statusCode, "User should read assets")
        assertEquals(HttpStatus.OK, getAs("/api/v1/assets/export", token).statusCode, "User should export assets")

        // Writes remain Admin/Operator only.
        val write = postJson("/api/v1/locations", """{"name":"nope-${System.nanoTime()}"}""", token)
        assertEquals(HttpStatus.FORBIDDEN, write.statusCode, "User must not be able to write")
    }

    @Test
    fun `a stale entityVersion update is rejected with 409`() {
        val token = loginAsAdmin()
        val name = "Loc-${System.nanoTime()}"
        val create = postJson("/api/v1/locations", """{"name":"$name"}""", token)
        assertEquals(HttpStatus.CREATED, create.statusCode)
        val id = field(create.body!!, "id")
        val version = field(create.body!!, "entityVersion")

        // First update with the current version succeeds and bumps the version.
        val ok = putJson("/api/v1/locations/$id", """{"name":"$name-a","entityVersion":$version}""", token)
        assertEquals(HttpStatus.OK, ok.statusCode, "first update should succeed: ${ok.body}")

        // Re-using the now-stale version must conflict.
        val stale = putJson("/api/v1/locations/$id", """{"name":"$name-b","entityVersion":$version}""", token)
        assertEquals(HttpStatus.CONFLICT, stale.statusCode, "stale-version update should 409, was ${stale.statusCode}")
    }
}
