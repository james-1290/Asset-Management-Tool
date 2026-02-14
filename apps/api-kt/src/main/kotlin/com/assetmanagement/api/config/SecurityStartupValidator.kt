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
    @Value("\${springdoc.api-docs.enabled:true}") private val swaggerEnabled: Boolean
) {
    private val log = LoggerFactory.getLogger(SecurityStartupValidator::class.java)

    @EventListener(ApplicationReadyEvent::class)
    fun validateSecurityConfig() {
        var warnings = 0

        if (jwtKey == "ThisIsASecretKeyForDevelopmentPurposesOnly123!") {
            log.warn("SECURITY: JWT secret is using the default development key. Set JWT_KEY environment variable for production!")
            warnings++
        }

        if (adminPassword == "admin123") {
            log.warn("SECURITY: Admin password is using the default 'admin123'. Set ADMIN_PASSWORD environment variable for production!")
            warnings++
        }

        if (scimEnabled && scimBearerToken == "change-me-in-production") {
            log.warn("SECURITY: SCIM is enabled with the default bearer token. Set SCIM_BEARER_TOKEN environment variable for production!")
            warnings++
        }

        if (swaggerEnabled) {
            log.warn("SECURITY: Swagger/OpenAPI is enabled. Set SWAGGER_ENABLED=false for production!")
            warnings++
        }

        if (warnings > 0) {
            log.warn("SECURITY: {} configuration warning(s) detected. Acceptable for local dev, MUST be fixed before production.", warnings)
        } else {
            log.info("Security configuration validated successfully.")
        }
    }
}
