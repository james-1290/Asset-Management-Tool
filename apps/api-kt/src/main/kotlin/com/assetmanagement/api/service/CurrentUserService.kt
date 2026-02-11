package com.assetmanagement.api.service

import com.assetmanagement.api.security.JwtUserDetails
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import java.util.*

@Service
class CurrentUserService {

    val userId: UUID?
        get() {
            val principal = SecurityContextHolder.getContext().authentication?.principal
            return when (principal) {
                is JwtUserDetails -> try { UUID.fromString(principal.userId) } catch (_: Exception) { null }
                else -> null
            }
        }

    val userName: String
        get() {
            val principal = SecurityContextHolder.getContext().authentication?.principal
            return when (principal) {
                is JwtUserDetails -> principal.displayName
                else -> "System"
            }
        }
}
