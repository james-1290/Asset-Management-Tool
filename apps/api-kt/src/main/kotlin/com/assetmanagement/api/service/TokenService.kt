package com.assetmanagement.api.service

import com.assetmanagement.api.model.User
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.nio.charset.StandardCharsets
import java.util.*

@Service
class TokenService(
    @Value("\${jwt.key}") private val jwtKey: String,
    @Value("\${jwt.issuer}") private val jwtIssuer: String,
    @Value("\${jwt.audience}") private val jwtAudience: String,
    @Value("\${jwt.expiry-hours:24}") private val expiryHours: Long
) {

    fun generateToken(user: User, roles: List<String>): String {
        val key = Keys.hmacShaKeyFor(jwtKey.toByteArray(StandardCharsets.UTF_8))
        val now = Date()
        val expiry = Date(now.time + expiryHours * 3600 * 1000)

        // Only include minimal claims — roles are loaded from DB on each request,
        // and PII (email, displayName) should not be in plaintext JWT tokens
        val claims = mutableMapOf<String, Any>(
            "unique_name" to user.username
        )

        return Jwts.builder()
            .subject(user.id.toString())
            .issuer(jwtIssuer)
            .audience().add(jwtAudience).and()
            .issuedAt(now)
            .expiration(expiry)
            .claims(claims)
            .signWith(key)
            .compact()
    }
}
