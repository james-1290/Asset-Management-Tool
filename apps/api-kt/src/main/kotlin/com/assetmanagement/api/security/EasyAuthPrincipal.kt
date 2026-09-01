package com.assetmanagement.api.security

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty
import tools.jackson.databind.ObjectMapper
import java.util.Base64

/**
 * The identity Azure App Service "Easy Auth" hands us for an authenticated
 * caller, decoded from the `X-MS-CLIENT-PRINCIPAL` header.
 *
 * App Service runs its auth module as a sidecar in front of this container and
 * injects these headers itself. The platform strips them from inbound external
 * requests, so a caller cannot forge one — but that guarantee only holds while
 * the container is genuinely unreachable except through the auth sidecar, which
 * is why [EasyAuthPrincipalFilter] is off unless explicitly enabled.
 */
data class EasyAuthPrincipal(
    val externalId: String,
    val username: String,
    val email: String,
    val displayName: String,
    /** Entra app-role values from the `roles` claim; empty when none are assigned. */
    val roles: List<String>
)

/**
 * Parses the base64-encoded JSON claims blob in `X-MS-CLIENT-PRINCIPAL`.
 *
 * Kept free of Spring and servlet types so the claim-shape handling — which is
 * the fiddly part — is directly unit-testable.
 */
object EasyAuthPrincipalParser {

    // Easy Auth applies a default claims-mapping pass, so a claim can arrive
    // under either its short OIDC name or the long WS-Federation URI depending
    // on provider and configuration. Accept both rather than betting on one.
    private const val CLAIM_OID_SHORT = "oid"
    private const val CLAIM_OID_URI = "http://schemas.microsoft.com/identity/claims/objectidentifier"
    private const val CLAIM_ROLES_SHORT = "roles"
    private const val CLAIM_ROLES_URI = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    private const val CLAIM_EMAIL_SHORT = "email"
    private const val CLAIM_EMAIL_URI = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
    private const val CLAIM_NAME_SHORT = "name"
    private const val CLAIM_NAME_URI = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
    private const val CLAIM_UPN_SHORT = "preferred_username"
    private const val CLAIM_UPN_URI = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn"

    @JsonIgnoreProperties(ignoreUnknown = true)
    data class RawClaim(
        @JsonProperty("typ") val type: String = "",
        @JsonProperty("val") val value: String = ""
    )

    @JsonIgnoreProperties(ignoreUnknown = true)
    data class RawPrincipal(
        @JsonProperty("auth_typ") val authType: String? = null,
        @JsonProperty("name_typ") val nameClaimType: String? = null,
        @JsonProperty("role_typ") val roleClaimType: String? = null,
        @JsonProperty("claims") val claims: List<RawClaim> = emptyList()
    )

    /**
     * Decodes the header into a principal, or returns null if it is absent,
     * malformed, or carries no usable identifier.
     *
     * [fallbackExternalId] and [fallbackUsername] come from the sibling
     * `X-MS-CLIENT-PRINCIPAL-ID` / `-NAME` headers, which App Service sets even
     * when the claims blob is sparse.
     */
    fun parse(
        header: String?,
        objectMapper: ObjectMapper,
        fallbackExternalId: String? = null,
        fallbackUsername: String? = null
    ): EasyAuthPrincipal? {
        if (header.isNullOrBlank()) return null

        val raw = try {
            val json = Base64.getDecoder().decode(header)
            objectMapper.readValue(json, RawPrincipal::class.java)
        } catch (_: Exception) {
            // A malformed header is treated as "no identity", never as an error:
            // the request simply continues unauthenticated and the security
            // chain rejects it, matching how a bad JWT is handled.
            return null
        }

        val claims = raw.claims

        // The object id is the only stable key — a user's UPN, email and display
        // name can all change in Entra, their object id cannot.
        val externalId = claims.firstValue(CLAIM_OID_URI, CLAIM_OID_SHORT)
            ?: fallbackExternalId?.takeIf { it.isNotBlank() }
            ?: return null

        val email = claims.firstValue(CLAIM_EMAIL_URI, CLAIM_EMAIL_SHORT, CLAIM_UPN_URI, CLAIM_UPN_SHORT)
            ?: fallbackUsername?.takeIf { it.isNotBlank() }
            ?: ""

        // `name_typ`/`role_typ` name the claims the provider considers canonical
        // for this principal; prefer them, then fall back to the usual suspects.
        val displayName = raw.nameClaimType?.let { claims.firstValue(it) }
            ?: claims.firstValue(CLAIM_NAME_URI, CLAIM_NAME_SHORT)
            ?: email.substringBefore("@").ifBlank { externalId }

        val roleClaimTypes = listOfNotNull(raw.roleClaimType, CLAIM_ROLES_SHORT, CLAIM_ROLES_URI).distinct()
        val roles = claims
            .filter { it.type in roleClaimTypes }
            .map { it.value.trim() }
            .filter { it.isNotEmpty() }
            .distinct()

        return EasyAuthPrincipal(
            externalId = externalId,
            username = email.ifBlank { externalId },
            email = email,
            displayName = displayName,
            roles = roles
        )
    }

    private fun List<RawClaim>.firstValue(vararg types: String): String? =
        types.firstNotNullOfOrNull { type ->
            firstOrNull { it.type == type && it.value.isNotBlank() }?.value
        }
}
