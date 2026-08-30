package com.assetmanagement.api.config

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.core.env.Environment
import org.springframework.stereotype.Component

/**
 * Refuses to serve a deployment that is configured insecurely.
 *
 * Fails **closed**: an unset or unrecognised profile is treated as production,
 * so a deploy that forgets `SPRING_PROFILES_ACTIVE` aborts rather than quietly
 * running with development settings.
 *
 * The checks changed shape when identity moved to Microsoft Entra. There is no
 * longer a JWT signing key or seeded admin password to leave at a default; the
 * risks now are running *without* the platform authentication that is supposed
 * to be in front of the app, or running the local sign-in emulator where real
 * users can reach it.
 */
@Component
class SecurityStartupValidator(
    private val environment: Environment,
    @Value("\${auth.easy-auth.enabled:false}") private val easyAuthEnabled: Boolean,
    @Value("\${auth.easy-auth.local-emulator.enabled:false}") private val localEmulatorEnabled: Boolean,
    @Value("\${scim.bearer-token:change-me-in-production}") private val scimBearerToken: String,
    @Value("\${scim.enabled:false}") private val scimEnabled: Boolean,
    @Value("\${springdoc.api-docs.enabled:true}") private val swaggerEnabled: Boolean
) {
    private val log = LoggerFactory.getLogger(SecurityStartupValidator::class.java)

    @EventListener(ApplicationReadyEvent::class)
    fun validateSecurityConfig() {
        val warnings = mutableListOf<String>()

        if (!easyAuthEnabled) {
            warnings.add(
                "SECURITY: Easy Auth is disabled (auth.easy-auth.enabled=false). Nothing would authenticate " +
                    "requests. Set EASY_AUTH_ENABLED=true and ensure App Service authentication is configured " +
                    "in front of this app."
            )
        }

        if (localEmulatorEnabled) {
            warnings.add(
                "SECURITY: the local Easy Auth emulator is enabled. It grants identities without a password " +
                    "and must never run outside local development."
            )
        }

        if (scimEnabled && scimBearerToken == "change-me-in-production") {
            warnings.add("SECURITY: SCIM is enabled with the default bearer token. Set SCIM_BEARER_TOKEN for production!")
        }

        if (swaggerEnabled) {
            warnings.add("SECURITY: Swagger/OpenAPI is enabled. Set SWAGGER_ENABLED=false for production!")
        }

        if (warnings.isNotEmpty()) {
            warnings.forEach { log.warn(it) }

            if (isDevProfile()) {
                log.warn("SECURITY: {} configuration warning(s) detected. Acceptable for local dev, MUST be fixed before production.", warnings.size)
            } else {
                val active = environment.activeProfiles.joinToString(",").ifEmpty { "(none)" }
                throw IllegalStateException(
                    "SECURITY: ${warnings.size} configuration warning(s) detected on profile '$active'. " +
                        "The app refuses to start with insecure settings unless an explicit dev profile " +
                        "(SPRING_PROFILES_ACTIVE=dev) is set. Warnings:\n" +
                        warnings.joinToString("\n") { "  - $it" }
                )
            }
        } else {
            log.info("Security configuration validated successfully.")
        }
    }

    /**
     * Whether an explicit developer/test profile is active. Read from the
     * Environment directly, since that reflects both `SPRING_PROFILES_ACTIVE`
     * and a test's `@ActiveProfiles`, unlike a `@Value` on the property.
     */
    private fun isDevProfile(): Boolean =
        environment.activeProfiles.any { it.lowercase() in setOf("dev", "test", "local") }
}
