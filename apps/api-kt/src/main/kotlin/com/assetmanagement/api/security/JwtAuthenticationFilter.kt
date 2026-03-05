package com.assetmanagement.api.security

import com.assetmanagement.api.repository.UserRepository
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.nio.charset.StandardCharsets
import java.util.*

@Component
class JwtAuthenticationFilter(
    @Value("\${jwt.key}") private val jwtKey: String,
    @Value("\${jwt.issuer}") private val jwtIssuer: String,
    @Value("\${jwt.audience}") private val jwtAudience: String,
    private val userRepository: UserRepository
) : OncePerRequestFilter() {

    private val log = org.slf4j.LoggerFactory.getLogger(JwtAuthenticationFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val authHeader = request.getHeader("Authorization")
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            val token = authHeader.substring(7)
            try {
                val key = Keys.hmacShaKeyFor(jwtKey.toByteArray(StandardCharsets.UTF_8))
                val claims: Claims = Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(jwtIssuer)
                    .requireAudience(jwtAudience)
                    .build()
                    .parseSignedClaims(token)
                    .payload

                val userId = claims.subject

                // Reject tokens for deactivated or deleted users
                // Use JOIN FETCH query to load roles from database (not JWT claims)
                val user = userRepository.findWithRolesById(UUID.fromString(userId))
                if (user == null || !user.isActive) {
                    filterChain.doFilter(request, response)
                    return
                }

                // Reject tokens issued before security-sensitive changes
                val issuedAt = claims.issuedAt
                if (issuedAt != null && user.tokenInvalidatedAt != null) {
                    if (issuedAt.toInstant().isBefore(user.tokenInvalidatedAt)) {
                        filterChain.doFilter(request, response)
                        return
                    }
                }

                val username = claims["unique_name"] as? String ?: ""
                val roles = user.userRoles.mapNotNull { it.role?.name }

                val authorities = roles.map { SimpleGrantedAuthority("ROLE_$it") }

                val auth = UsernamePasswordAuthenticationToken(
                    JwtUserDetails(userId, username, user.displayName),
                    null,
                    authorities
                )
                SecurityContextHolder.getContext().authentication = auth
            } catch (e: Exception) {
                log.debug("Invalid JWT token: {}", e.message)
                SecurityContextHolder.clearContext()
            }
        }
        filterChain.doFilter(request, response)
    }
}

data class JwtUserDetails(
    val userId: String,
    val username: String,
    val displayName: String
)
