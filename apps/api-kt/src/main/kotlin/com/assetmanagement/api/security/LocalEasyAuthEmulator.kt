package com.assetmanagement.api.security

import tools.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.core.env.Environment
import org.springframework.stereotype.Component
import java.util.Base64
import java.util.UUID

/**
 * A local stand-in for the Azure App Service authentication sidecar.
 *
 * On App Service, the platform authenticates the user against Entra and injects
 * `X-MS-CLIENT-PRINCIPAL` into the request. There is no such sidecar on a
 * developer's machine, so this emulator produces the identical header from a
 * chosen developer identity. The application therefore runs the *same*
 * [EasyAuthPrincipalFilter] code path locally as it does in Azure, and moving to
 * App Service is a configuration change rather than a code change.
 *
 * This is a development affordance and a security hazard if it ever ran in
 * production — it mints identities on request. It is gated on an explicit
 * property *and* refuses to construct outside an explicit dev/local/test
 * profile, matching how [com.assetmanagement.api.config.SecurityStartupValidator]
 * fails closed on an unset profile.
 */
@Component
@ConditionalOnProperty(name = ["auth.easy-auth.local-emulator.enabled"], havingValue = "true")
class LocalEasyAuthEmulator(
    environment: Environment,
    private val objectMapper: ObjectMapper,
    @Value("\${auth.easy-auth.local-emulator.identities:}") identitiesConfig: String
) {

    private val log = LoggerFactory.getLogger(LocalEasyAuthEmulator::class.java)

    companion object {
        /**
         * Deliberately the same cookie name App Service uses, so the frontend's
         * sign-in handling is byte-for-byte the same locally and in Azure.
         */
        const val SESSION_COOKIE = "AppServiceAuthSession"

        private val DEV_PROFILES = setOf("dev", "local", "test")

        /** Claim types matching what Easy Auth emits for an Entra sign-in. */
        const val CLAIM_OID = "http://schemas.microsoft.com/identity/claims/objectidentifier"
        const val CLAIM_EMAIL = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
        const val CLAIM_NAME = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
        const val CLAIM_ROLE = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"

        private val DEFAULT_IDENTITIES = listOf(
            DevIdentity("admin", "dev-admin@localhost", "Dev Admin", listOf("Admin")),
            DevIdentity("operator", "dev-operator@localhost", "Dev Operator", listOf("Operator")),
            DevIdentity("user", "dev-user@localhost", "Dev User", listOf("User")),
            // Present on purpose: exercises the "assigned to the app but holding
            // no app role" path, which must be refused.
            DevIdentity("norole", "dev-norole@localhost", "Dev No Role", emptyList())
        )
    }

    data class DevIdentity(
        val key: String,
        val email: String,
        val displayName: String,
        val roles: List<String>
    ) {
        /**
         * Stable synthetic Entra object id. Derived from the key so it survives
         * restarts and keeps mapping to the same local `users` row.
         */
        val objectId: String get() = UUID.nameUUIDFromBytes("local-easy-auth:$key".toByteArray()).toString()
    }

    val identities: List<DevIdentity> = parseIdentities(identitiesConfig).ifEmpty { DEFAULT_IDENTITIES }

    init {
        val active = environment.activeProfiles.map { it.lowercase() }
        if (active.none { it in DEV_PROFILES }) {
            throw IllegalStateException(
                "SECURITY: the local Easy Auth emulator is enabled but no dev profile is active " +
                    "(active profiles: ${active.ifEmpty { listOf("(none)") }.joinToString(",")}). " +
                    "This component mints identities on request and must never run outside local " +
                    "development. Unset AUTH_EASY_AUTH_LOCAL_EMULATOR_ENABLED, or set " +
                    "SPRING_PROFILES_ACTIVE=dev if this really is a developer machine."
            )
        }
        log.warn(
            "LOCAL EASY AUTH EMULATOR ACTIVE — identities can be assumed without a password at " +
                "/.auth/login/aad. Development only. Available identities: {}",
            identities.joinToString(", ") { "${it.key} (${it.roles.joinToString("/").ifEmpty { "no roles" }})" }
        )
    }

    fun find(key: String?): DevIdentity? = key?.let { k -> identities.firstOrNull { it.key == k } }

    /** The claim list, in the shape Easy Auth's `/.auth/me` returns it. */
    fun claims(identity: DevIdentity): List<Map<String, String>> = buildList {
        add(mapOf("typ" to CLAIM_OID, "val" to identity.objectId))
        add(mapOf("typ" to CLAIM_EMAIL, "val" to identity.email))
        add(mapOf("typ" to CLAIM_NAME, "val" to identity.displayName))
        identity.roles.forEach { add(mapOf("typ" to CLAIM_ROLE, "val" to it)) }
    }

    /** The base64 `X-MS-CLIENT-PRINCIPAL` value the platform would have injected. */
    fun principalHeader(identity: DevIdentity): String {
        val payload = mapOf(
            "auth_typ" to "aad",
            "name_typ" to CLAIM_NAME,
            "role_typ" to CLAIM_ROLE,
            "claims" to claims(identity)
        )
        return Base64.getEncoder().encodeToString(objectMapper.writeValueAsBytes(payload))
    }

    /**
     * Parses `key:email:Display Name:Role1|Role2` entries, separated by commas.
     * Blank config falls back to the built-in Admin/Operator/User/no-role set.
     */
    private fun parseIdentities(config: String): List<DevIdentity> =
        config.split(",")
            .mapNotNull { entry ->
                val parts = entry.split(":").map { it.trim() }
                if (parts.size < 3 || parts[0].isEmpty()) {
                    if (entry.isNotBlank()) log.warn("Ignoring malformed dev identity '{}'", entry)
                    return@mapNotNull null
                }
                DevIdentity(
                    key = parts[0],
                    email = parts[1],
                    displayName = parts[2],
                    roles = parts.getOrNull(3)?.split("|")?.map { it.trim() }?.filter { it.isNotEmpty() } ?: emptyList()
                )
            }
}
