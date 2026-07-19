package com.assetmanagement.api.util

import jakarta.servlet.http.HttpServletRequest
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

/**
 * Resolves the client IP for rate-limiting / lockout keys. `X-Forwarded-For` is
 * only honoured when the app sits behind a proxy that sets it
 * (`security.trust-forwarded-for=true`); otherwise a client could spoof/rotate
 * the header to evade per-IP limits, so we fall back to the socket peer address.
 */
@Component
class ClientIpResolver(
    @Value("\${security.trust-forwarded-for:false}") private val trustForwardedFor: Boolean,
) {
    fun resolve(request: HttpServletRequest): String =
        if (trustForwardedFor) {
            request.getHeader("X-Forwarded-For")?.split(",")?.firstOrNull()?.trim()?.ifBlank { null }
                ?: request.remoteAddr
        } else {
            request.remoteAddr
        }
}
