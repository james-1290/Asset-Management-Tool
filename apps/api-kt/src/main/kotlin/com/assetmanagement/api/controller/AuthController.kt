package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.LoginRequest
import com.assetmanagement.api.dto.LoginResponse
import com.assetmanagement.api.dto.UserProfileResponse
import com.assetmanagement.api.repository.UserRepository
import com.assetmanagement.api.service.CurrentUserService
import com.assetmanagement.api.service.TokenService
import org.springframework.http.ResponseEntity
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val userRepository: UserRepository,
    private val tokenService: TokenService,
    private val passwordEncoder: PasswordEncoder,
    private val currentUserService: CurrentUserService
) {

    @PostMapping("/login")
    fun login(@RequestBody request: LoginRequest): ResponseEntity<Any> {
        val user = userRepository.findByUsername(request.username)
            ?: return ResponseEntity.status(401).body(mapOf("error" to "Invalid username or password."))

        if (!user.isActive || !passwordEncoder.matches(request.password, user.passwordHash))
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
                themePreference = user.themePreference
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
            themePreference = user.themePreference
        ))
    }
}
