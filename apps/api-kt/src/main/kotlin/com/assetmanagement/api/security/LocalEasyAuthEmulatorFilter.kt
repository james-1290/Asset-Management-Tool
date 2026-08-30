package com.assetmanagement.api.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletRequestWrapper
import jakarta.servlet.http.HttpServletResponse
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.util.Collections

/**
 * Injects the `X-MS-CLIENT-PRINCIPAL` headers that the App Service auth sidecar
 * would have added, based on the developer identity held in the session cookie.
 * Runs immediately before [EasyAuthPrincipalFilter], which is then none the
 * wiser about where the headers came from.
 *
 * The wrapper is *authoritative* for these headers: a client-supplied
 * `X-MS-CLIENT-PRINCIPAL` is discarded rather than passed through, mirroring the
 * platform's guarantee that external requests cannot set them. Without that, the
 * emulator would turn a dev machine into one where any caller can assert any
 * identity simply by setting a header.
 */
@Component
@ConditionalOnProperty(name = ["auth.easy-auth.local-emulator.enabled"], havingValue = "true")
class LocalEasyAuthEmulatorFilter(
    private val emulator: LocalEasyAuthEmulator
) : OncePerRequestFilter() {

    private val managedHeaders = setOf(
        EasyAuthPrincipalFilter.HEADER_PRINCIPAL.lowercase(),
        EasyAuthPrincipalFilter.HEADER_PRINCIPAL_ID.lowercase(),
        EasyAuthPrincipalFilter.HEADER_PRINCIPAL_NAME.lowercase(),
        "x-ms-client-principal-idp"
    )

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val identity = emulator.find(
            request.cookies?.firstOrNull { it.name == LocalEasyAuthEmulator.SESSION_COOKIE }?.value
        )

        val injected: Map<String, String> = if (identity == null) emptyMap() else mapOf(
            EasyAuthPrincipalFilter.HEADER_PRINCIPAL.lowercase() to emulator.principalHeader(identity),
            EasyAuthPrincipalFilter.HEADER_PRINCIPAL_ID.lowercase() to identity.objectId,
            EasyAuthPrincipalFilter.HEADER_PRINCIPAL_NAME.lowercase() to identity.email,
            "x-ms-client-principal-idp" to "aad"
        )

        filterChain.doFilter(EmulatedRequest(request, injected), response)
    }

    private inner class EmulatedRequest(
        request: HttpServletRequest,
        private val injected: Map<String, String>
    ) : HttpServletRequestWrapper(request) {

        override fun getHeader(name: String): String? {
            val key = name.lowercase()
            // Return the emulated value, or nothing at all — never the caller's.
            if (key in managedHeaders) return injected[key]
            return super.getHeader(name)
        }

        override fun getHeaders(name: String): java.util.Enumeration<String> {
            val key = name.lowercase()
            if (key in managedHeaders) {
                val value = injected[key]
                return Collections.enumeration(if (value == null) emptyList() else listOf(value))
            }
            return super.getHeaders(name)
        }

        override fun getHeaderNames(): java.util.Enumeration<String> {
            val names = super.getHeaderNames().toList().filter { it.lowercase() !in managedHeaders }
            return Collections.enumeration(names + injected.keys)
        }
    }
}
