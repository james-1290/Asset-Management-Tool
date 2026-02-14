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
                val user = userRepository.findById(UUID.fromString(userId)).orElse(null)
                if (user == null || !user.isActive) {
                    filterChain.doFilter(request, response)
                    return
                }

                val username = claims["unique_name"] as? String ?: ""
                val roles = (claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] as? List<*>)
                    ?.mapNotNull { it as? String }
                    ?: (claims["role"] as? List<*>)?.mapNotNull { it as? String }
                    ?: listOfNotNull(claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] as? String)
                    .plus(listOfNotNull(claims["role"] as? String))

                val authorities = roles.map { SimpleGrantedAuthority("ROLE_$it") }

                val auth = UsernamePasswordAuthenticationToken(
                    JwtUserDetails(userId, username, claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] as? String ?: username),
                    null,
                    authorities
                )
                SecurityContextHolder.getContext().authentication = auth
            } catch (_: Exception) {
                // Invalid token — continue without auth
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
