package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.LoginRequest
import com.assetmanagement.api.dto.LoginResponse
import com.assetmanagement.api.dto.SsoConfigResponse
import com.assetmanagement.api.dto.UserProfileResponse
import com.assetmanagement.api.repository.UserRepository
import com.assetmanagement.api.service.CurrentUserService
import com.assetmanagement.api.service.TokenService
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.ResponseEntity
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val userRepository: UserRepository,
    private val tokenService: TokenService,
    private val passwordEncoder: PasswordEncoder,
    private val currentUserService: CurrentUserService,
    @Value("\${saml.enabled:false}") private val samlEnabled: Boolean,
    @Value("\${saml.registration-id:entra}") private val samlRegistrationId: String,
    @Value("\${auth.local-login.enabled:true}") private val localLoginEnabled: Boolean
) {

    @PostMapping("/login")
    fun login(@RequestBody request: LoginRequest): ResponseEntity<Any> {
        if (!localLoginEnabled) {
            return ResponseEntity.status(404).body(mapOf("error" to "Local login is disabled. Use SSO to sign in."))
        }

        val user = userRepository.findByUsername(request.username)
            ?: return ResponseEntity.status(401).body(mapOf("error" to "Invalid username or password."))

        if (user.authProvider != "LOCAL")
            return ResponseEntity.status(401).body(mapOf("error" to "This account uses SSO. Please sign in with your identity provider."))

        if (!user.isActive)
            return ResponseEntity.status(401).body(mapOf("error" to "Invalid username or password."))

        val passwordHash = user.passwordHash
        if (passwordHash == null || !passwordEncoder.matches(request.password, passwordHash))
            return ResponseEntity.status(401).body(mapOf("error" to "Invalid username or password."))

        val roles = user.userRoles.mapNotNull { it.role?.name }
        val token = tokenService.generateToken(user, roles)

        return ResponseEntity.ok(LoginResponse(
            token = token,
            user = UserProfileResponse(
                id = user.id,
                username = user.username,
                displayName = user.displayName,
                email = user.email,
                roles = roles,
                themePreference = user.themePreference,
                authProvider = user.authProvider
            )
        ))
    }

    @GetMapping("/me")
    fun me(): ResponseEntity<Any> {
        val userId = currentUserService.userId
            ?: return ResponseEntity.status(401).build()

        val user = userRepository.findById(userId).orElse(null)
            ?: return ResponseEntity.status(401).build()

        if (!user.isActive) return ResponseEntity.status(401).build()

        val roles = user.userRoles.mapNotNull { it.role?.name }
        return ResponseEntity.ok(UserProfileResponse(
            id = user.id,
            username = user.username,
            displayName = user.displayName,
            email = user.email,
            roles = roles,
            themePreference = user.themePreference,
            authProvider = user.authProvider
        ))
    }

    @GetMapping("/sso-config")
    fun ssoConfig(): ResponseEntity<SsoConfigResponse> {
        return ResponseEntity.ok(SsoConfigResponse(
            ssoEnabled = samlEnabled,
            ssoUrl = if (samlEnabled) "/saml2/authenticate/$samlRegistrationId" else null,
            ssoLabel = if (samlEnabled) "Sign in with Microsoft" else null
        ))
    }
}
