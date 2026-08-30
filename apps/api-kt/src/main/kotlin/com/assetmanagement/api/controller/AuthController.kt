package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.LoginRequest
import com.assetmanagement.api.dto.LoginResponse
import com.assetmanagement.api.dto.UserProfileResponse
import com.assetmanagement.api.repository.UserRepository
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
import com.assetmanagement.api.service.LoginRateLimitService
import com.assetmanagement.api.service.TokenService
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
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
    private val auditService: AuditService,
    private val loginRateLimitService: LoginRateLimitService,
    private val clientIpResolver: com.assetmanagement.api.util.ClientIpResolver,
    @Value("\${auth.local-login.enabled:true}") private val localLoginEnabled: Boolean
) {

    // A fixed bcrypt hash used only to spend bcrypt time on failure paths where
    // there's no real hash to check, so login timing doesn't reveal whether a
    // username exists. Computed from the same encoder, so its cost factor always
    // matches real password hashes.
    private val dummyPasswordHash: String by lazy { passwordEncoder.encode("timing-equalizer") }

    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginRequest, httpRequest: HttpServletRequest): ResponseEntity<Any> {
        if (!localLoginEnabled) {
            return ResponseEntity.status(404).body(mapOf("error" to "Local login is disabled. Use SSO to sign in."))
        }

        // Use the proxy-gated client IP (not raw X-Forwarded-For) so an attacker
        // can't rotate the header to reset the per-account lockout counter.
        val clientIp = clientIpResolver.resolve(httpRequest)
        val rateLimitKey = "$clientIp:${request.username}"

        if (loginRateLimitService.isBlocked(rateLimitKey)) {
            val remaining = loginRateLimitService.remainingLockoutSeconds(rateLimitKey)
            return ResponseEntity.status(429).body(mapOf("error" to "Too many login attempts. Try again in ${remaining / 60 + 1} minutes."))
        }

        // Identical response for every failure mode below, so a caller can't tell
        // "no such user" from "SSO account" from "wrong password" (account
        // enumeration). Each failure path also runs exactly one bcrypt — a real
        // check, or a dummy against a fixed hash — so response time doesn't leak
        // whether the username exists.
        val invalidCredentials = ResponseEntity.status(401).body<Any>(mapOf("error" to "Invalid username or password."))

        val user = userRepository.findWithRolesByUsername(request.username)
        if (user == null) {
            passwordEncoder.matches(request.password, dummyPasswordHash) // equalize timing
            auditService.log(AuditEntry("LoginFailed", "User", "", request.username,
                "Failed login attempt — user not found", null, request.username))
            loginRateLimitService.recordFailedAttempt(rateLimitKey)
            return invalidCredentials
        }

        if (user.authProvider != "LOCAL") {
            passwordEncoder.matches(request.password, dummyPasswordHash) // equalize timing
            // Audit this like every other failure branch: without it, local-login
            // attempts against SSO-provisioned accounts leave no LoginFailed trail
            // (a monitoring blind spot on high-value targets), and the missing
            // synchronous audit insert would also make this branch return faster
            // than the others — reintroducing a timing signal.
            auditService.log(AuditEntry("LoginFailed", "User", user.id.toString(), request.username,
                "Failed login attempt — non-local (SSO) account", null, request.username))
            loginRateLimitService.recordFailedAttempt(rateLimitKey)
            return invalidCredentials
        }

        if (!user.isActive) {
            passwordEncoder.matches(request.password, dummyPasswordHash) // equalize timing
            auditService.log(AuditEntry("LoginFailed", "User", user.id.toString(), request.username,
                "Failed login attempt — account inactive", null, request.username))
            loginRateLimitService.recordFailedAttempt(rateLimitKey)
            return invalidCredentials
        }

        val passwordHash = user.passwordHash
        if (passwordHash == null || !passwordEncoder.matches(request.password, passwordHash)) {
            if (passwordHash == null) passwordEncoder.matches(request.password, dummyPasswordHash) // equalize timing
            auditService.log(AuditEntry("LoginFailed", "User", user.id.toString(), request.username,
                "Failed login attempt — invalid password", null, request.username))
            loginRateLimitService.recordFailedAttempt(rateLimitKey)
            return invalidCredentials
        }

        val roles = user.userRoles.mapNotNull { it.role?.name }
        val token = tokenService.generateToken(user, roles)

        loginRateLimitService.recordSuccessfulLogin(rateLimitKey)

        auditService.log(AuditEntry("Login", "User", user.id.toString(), user.displayName,
            "User logged in successfully", user.id, user.username))

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

        val user = userRepository.findWithRolesById(userId)
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
}
