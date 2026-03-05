package com.assetmanagement.api.config

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component

@Component
class SecurityStartupValidator(
    @Value("\${jwt.key}") private val jwtKey: String,
    @Value("\${app.admin.password:admin123}") private val adminPassword: String,
    @Value("\${scim.bearer-token:change-me-in-production}") private val scimBearerToken: String,
    @Value("\${scim.enabled:false}") private val scimEnabled: Boolean,
    @Value("\${springdoc.api-docs.enabled:true}") private val swaggerEnabled: Boolean,
    @Value("\${spring.profiles.active:default}") private val activeProfile: String,
    @Value("\${auth.local-login.enabled:true}") private val localLoginEnabled: Boolean
) {
    private val log = LoggerFactory.getLogger(SecurityStartupValidator::class.java)

    @EventListener(ApplicationReadyEvent::class)
    fun validateSecurityConfig() {
        val warnings = mutableListOf<String>()

        if (jwtKey == "ThisIsASecretKeyForDevelopmentPurposesOnly123!") {
            warnings.add("SECURITY: JWT secret is using the default development key. Set JWT_KEY environment variable for production!")
        }

        if (adminPassword == "admin123") {
            warnings.add("SECURITY: Admin password is using the default 'admin123'. Set ADMIN_PASSWORD environment variable for production!")
        }

        if (scimEnabled && scimBearerToken == "change-me-in-production") {
            warnings.add("SECURITY: SCIM is enabled with the default bearer token. Set SCIM_BEARER_TOKEN environment variable for production!")
        }

        if (swaggerEnabled) {
            warnings.add("SECURITY: Swagger/OpenAPI is enabled. Set SWAGGER_ENABLED=false for production!")
        }

        if (localLoginEnabled && adminPassword == "admin123" && !isDevProfile()) {
            warnings.add("SECURITY: LOCAL_LOGIN_ENABLED=true with default admin password on non-dev profile!")
        }

        if (warnings.isNotEmpty()) {
            warnings.forEach { log.warn(it) }

            if (isDevProfile()) {
                log.warn("SECURITY: {} configuration warning(s) detected. Acceptable for local dev, MUST be fixed before production.", warnings.size)
            } else {
                throw IllegalStateException(
                    "SECURITY: ${warnings.size} configuration warning(s) detected on '${activeProfile}' profile. " +
                    "Fix all security warnings before starting in non-dev mode. Warnings:\n" +
                    warnings.joinToString("\n") { "  - $it" }
                )
            }
        } else {
            log.info("Security configuration validated successfully.")
        }
    }

    private fun isDevProfile(): Boolean {
        return activeProfile in setOf("default", "dev")
    }
}
