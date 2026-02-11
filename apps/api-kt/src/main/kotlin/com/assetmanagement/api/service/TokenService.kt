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

        val claims = mutableMapOf<String, Any>(
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier" to user.id.toString(),
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name" to user.displayName,
            "unique_name" to user.username,
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress" to user.email
        )

        if (roles.size == 1) {
            claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] = roles[0]
        } else if (roles.size > 1) {
            claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] = roles
        }

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
