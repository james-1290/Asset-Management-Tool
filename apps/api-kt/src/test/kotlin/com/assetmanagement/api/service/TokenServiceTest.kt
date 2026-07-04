package com.assetmanagement.api.service

import com.assetmanagement.api.model.User
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.nio.charset.StandardCharsets
import java.util.UUID

class TokenServiceTest {

    private val key = "test-signing-key-that-is-at-least-32-bytes-long-1234567890"
    private val issuer = "AssetManagementApi"
    private val audience = "AssetManagementApp"
    private val service = TokenService(key, issuer, audience, 24)

    private fun parse(token: String, signingKey: String = key) =
        Jwts.parser()
            .verifyWith(Keys.hmacShaKeyFor(signingKey.toByteArray(StandardCharsets.UTF_8)))
            .build()
            .parseSignedClaims(token)
            .payload

    private fun user(name: String) =
        User(id = UUID.randomUUID(), username = name, email = "$name@example.com", displayName = name)

    @Test
    fun `token carries subject, issuer, audience and username claim`() {
        val u = user("alice")
        val claims = parse(service.generateToken(u, listOf("Admin")))
        assertEquals(u.id.toString(), claims.subject)
        assertEquals(issuer, claims.issuer)
        assertTrue(claims.audience.contains(audience))
        assertEquals("alice", claims["unique_name"])
    }

    @Test
    fun `token does not embed PII or roles`() {
        val claims = parse(service.generateToken(user("bob"), listOf("Admin", "Operator")))
        // roles are resolved from the DB per request, and email/displayName must not be in the token
        assertTrue(claims["roles"] == null)
        assertTrue(claims["email"] == null)
    }

    @Test
    fun `token expiry is after its issued-at`() {
        val claims = parse(service.generateToken(user("carol"), emptyList()))
        assertNotNull(claims.expiration)
        assertTrue(claims.expiration.after(claims.issuedAt))
    }

    @Test
    fun `a token signed with a different key fails verification`() {
        val token = service.generateToken(user("eve"), emptyList())
        assertThrows(Exception::class.java) {
            parse(token, signingKey = "a-completely-different-signing-key-at-least-32-bytes")
        }
    }
}
