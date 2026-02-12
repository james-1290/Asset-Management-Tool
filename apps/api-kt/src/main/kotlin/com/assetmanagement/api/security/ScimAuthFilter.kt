package com.assetmanagement.api.security

import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
@ConditionalOnProperty(name = ["scim.enabled"], havingValue = "true")
class ScimAuthFilter(
    @Value("\${scim.bearer-token}") private val bearerToken: String,
    private val objectMapper: ObjectMapper
) : OncePerRequestFilter() {

    override fun shouldNotFilter(request: HttpServletRequest): Boolean {
        return !request.requestURI.startsWith("/scim/v2/")
    }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val authHeader = request.getHeader("Authorization")
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            sendScimError(response, 401, "Bearer token required")
            return
        }

        val token = authHeader.substring(7)
        if (token != bearerToken) {
            sendScimError(response, 401, "Invalid bearer token")
            return
        }

        // Set authentication for SCIM requests
        val auth = UsernamePasswordAuthenticationToken(
            "scim-client",
            null,
            listOf(SimpleGrantedAuthority("ROLE_SCIM"))
        )
        SecurityContextHolder.getContext().authentication = auth

        filterChain.doFilter(request, response)
    }

    private fun sendScimError(response: HttpServletResponse, status: Int, detail: String) {
        response.status = status
        response.contentType = "application/scim+json"
        response.writer.write(objectMapper.writeValueAsString(mapOf(
            "schemas" to listOf("urn:ietf:params:scim:api:messages:2.0:Error"),
            "status" to status.toString(),
            "detail" to detail
        )))
    }
}
