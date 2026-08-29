package com.assetmanagement.api.config

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.core.env.Environment
import org.springframework.stereotype.Component

@Component
class SecurityStartupValidator(
    private val environment: Environment,
    @Value("\${jwt.key}") private val jwtKey: String,
    @Value("\${app.admin.password:admin123}") private val adminPassword: String,
    @Value("\${scim.bearer-token:change-me-in-production}") private val scimBearerToken: String,
    @Value("\${scim.enabled:false}") private val scimEnabled: Boolean,
    @Value("\${springdoc.api-docs.enabled:true}") private val swaggerEnabled: Boolean,
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
                val active = environment.activeProfiles.joinToString(",").ifEmpty { "(none)" }
                throw IllegalStateException(
                    "SECURITY: ${warnings.size} configuration warning(s) detected on profile '$active'. " +
                    "The app refuses to start with insecure defaults unless an explicit dev profile " +
                    "(SPRING_PROFILES_ACTIVE=dev) is set. For a real deployment, provide the required " +
                    "secrets (JWT_KEY, ADMIN_PASSWORD, and SCIM_BEARER_TOKEN if SCIM is enabled). Warnings:\n" +
                    warnings.joinToString("\n") { "  - $it" }
                )
            }
        } else {
            log.info("Security configuration validated successfully.")
        }
    }

    /**
     * Whether the app is running under an explicit developer/test profile that
     * may tolerate default secrets. Fail-CLOSED: an unset or "default" profile is
     * treated as production, so a deploy that forgets SPRING_PROFILES_ACTIVE
     * refuses to boot with the committed default JWT key / admin password rather
     * than silently running insecure. Only these named profiles opt into dev mode.
     */
    private fun isDevProfile(): Boolean {
        // Read the Environment's active profiles directly: this reflects both
        // SPRING_PROFILES_ACTIVE and test @ActiveProfiles, unlike a
        // @Value("\${spring.profiles.active}") which @ActiveProfiles doesn't set.
        return environment.activeProfiles.any { it.lowercase() in setOf("dev", "test", "local") }
    }
}
