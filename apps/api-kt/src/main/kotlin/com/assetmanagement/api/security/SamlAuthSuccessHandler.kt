package com.assetmanagement.api.security

import com.assetmanagement.api.model.User
import com.assetmanagement.api.model.UserRole
import com.assetmanagement.api.repository.RoleRepository
import com.assetmanagement.api.repository.UserRepository
import com.assetmanagement.api.repository.UserRoleRepository
import com.assetmanagement.api.service.TokenService
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.security.core.Authentication
import org.springframework.security.saml2.provider.service.authentication.Saml2AuthenticatedPrincipal
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.stereotype.Component
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.Instant

@Component
@ConditionalOnProperty(name = ["saml.enabled"], havingValue = "true")
class SamlAuthSuccessHandler(
    private val userRepository: UserRepository,
    private val roleRepository: RoleRepository,
    private val userRoleRepository: UserRoleRepository,
    private val tokenService: TokenService,
    @Value("\${saml.default-role:User}") private val defaultRole: String,
    @Value("\${saml.frontend-origin:http://localhost:5173}") private val frontendOrigin: String
) : AuthenticationSuccessHandler {

    private val log = LoggerFactory.getLogger(SamlAuthSuccessHandler::class.java)

    override fun onAuthenticationSuccess(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authentication: Authentication
    ) {
        val principal = authentication.principal as Saml2AuthenticatedPrincipal

        val externalId = principal.getFirstAttribute<String>(
            "http://schemas.microsoft.com/identity/claims/objectidentifier"
        ) ?: principal.name

        val email = principal.getFirstAttribute<String>(
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
        ) ?: ""

        val displayName = principal.getFirstAttribute<String>(
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/displayname"
        ) ?: principal.getFirstAttribute<String>(
            "http://schemas.microsoft.com/identity/claims/displayname"
        ) ?: email.substringBefore("@")

        log.info("SAML login: externalId={}, email={}, displayName={}", externalId, email, displayName)

        val user = findOrCreateUser(externalId, email, displayName)

        if (!user.isActive) {
            log.warn("SAML login rejected: user {} is deactivated", user.id)
            response.sendRedirect("$frontendOrigin/login?error=account_disabled")
            return
        }

        val roles = user.userRoles.mapNotNull { it.role?.name }
        val jwt = tokenService.generateToken(user, roles)

        val encodedToken = URLEncoder.encode(jwt, StandardCharsets.UTF_8)
        response.sendRedirect("$frontendOrigin/login?token=$encodedToken&sso=1")
    }

    private fun findOrCreateUser(externalId: String, email: String, displayName: String): User {
        // 1. Try by externalId
        userRepository.findByExternalId(externalId)?.let { user ->
            return updateIfNeeded(user, email, displayName)
        }

        // 2. Try by email — link existing local user to SSO
        userRepository.findByEmail(email)?.let { user ->
            user.externalId = externalId
            user.authProvider = "SAML"
            user.displayName = displayName
            user.updatedAt = Instant.now()
            return userRepository.save(user)
        }

        // 3. Create new user
        val username = email.ifBlank { externalId }
        val user = User(
            username = username,
            email = email,
            displayName = displayName,
            passwordHash = null,
            authProvider = "SAML",
            externalId = externalId
        )
        userRepository.save(user)

        val role = roleRepository.findByName(defaultRole)
        if (role != null) {
            userRoleRepository.save(UserRole(userId = user.id, roleId = role.id))
        }

        log.info("JIT provisioned SAML user: id={}, email={}", user.id, email)
        return user
    }

    private fun updateIfNeeded(user: User, email: String, displayName: String): User {
        var changed = false
        if (email.isNotBlank() && user.email != email) { user.email = email; changed = true }
        if (displayName.isNotBlank() && user.displayName != displayName) { user.displayName = displayName; changed = true }
        if (changed) {
            user.updatedAt = Instant.now()
            userRepository.save(user)
        }
        return user
    }
}
