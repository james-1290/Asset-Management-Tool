package com.assetmanagement.api.security

import com.assetmanagement.api.service.EasyAuthUserService
import tools.jackson.databind.ObjectMapper
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * Authenticates requests from the Azure App Service authentication ("Easy Auth")
 * sidecar, which sits in front of this container, completes the Entra sign-in
 * itself, and passes the resulting identity down as request headers.
 *
 * Enabled only when `auth.easy-auth.enabled` is true. That flag is the trust
 * boundary: these headers are only trustworthy when every route to this
 * container passes through the auth sidecar, so the app must never be told to
 * trust them outside an App Service deployment configured that way.
 */
@Component
@ConditionalOnProperty(name = ["auth.easy-auth.enabled"], havingValue = "true")
class EasyAuthPrincipalFilter(
    private val easyAuthUserService: EasyAuthUserService,
    private val objectMapper: ObjectMapper
) : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(EasyAuthPrincipalFilter::class.java)

    companion object {
        const val HEADER_PRINCIPAL = "X-MS-CLIENT-PRINCIPAL"
        const val HEADER_PRINCIPAL_ID = "X-MS-CLIENT-PRINCIPAL-ID"
        const val HEADER_PRINCIPAL_NAME = "X-MS-CLIENT-PRINCIPAL-NAME"

        /**
         * Carries *why* the platform-authenticated caller was refused, so the
         * entry point can explain it.
         *
         * The refused/not-signed-in distinction matters to the SPA: "not signed
         * in" is fixed by sending the user to the identity provider, whereas
         * "signed in but refused" is not — redirecting there would return the
         * user right back, refused again, forever. The entry point uses this to
         * answer 403 instead of 401 so the client can show an explanation
         * rather than loop.
         */
        const val ATTR_REFUSAL = "com.assetmanagement.easyAuth.refusal"
    }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        // Leave an already-populated context alone: the SCIM filter runs ahead
        // of this one and authenticates machine callers on its own terms.
        if (SecurityContextHolder.getContext().authentication == null) {
            authenticate(request)
        }
        filterChain.doFilter(request, response)
    }

    /**
     * Resolves the principal, retrying once if a concurrent request beat us to
     * provisioning the same brand-new user.
     *
     * The SPA issues several requests in parallel as it loads, so a user's very
     * first sign-in routinely arrives as a burst. Each request finds no row,
     * each inserts, and all but one hit the unique constraint on username /
     * external id — leaving the user apparently unauthenticated on their first
     * ever visit. The loser's transaction is rolled back, so a second attempt
     * simply finds the row the winner created.
     */
    private fun resolveWithRetry(principal: EasyAuthPrincipal): EasyAuthUserService.Resolution =
        try {
            easyAuthUserService.resolve(principal)
        } catch (e: DataIntegrityViolationException) {
            log.debug("Lost a provisioning race for externalId={}, retrying", principal.externalId)
            easyAuthUserService.resolve(principal)
        }

    private fun authenticate(request: HttpServletRequest) {
        val principal = EasyAuthPrincipalParser.parse(
            header = request.getHeader(HEADER_PRINCIPAL),
            objectMapper = objectMapper,
            fallbackExternalId = request.getHeader(HEADER_PRINCIPAL_ID),
            fallbackUsername = request.getHeader(HEADER_PRINCIPAL_NAME)
        ) ?: return

        val resolution = try {
            resolveWithRetry(principal)
        } catch (e: Exception) {
            // Never turn a provisioning failure into a 500 on every request —
            // fail closed to "unauthenticated" and let the security chain answer.
            log.error("Easy Auth user resolution failed for externalId={}", principal.externalId, e)
            return
        }

        if (resolution !is EasyAuthUserService.Resolution.Allowed) {
            // The platform vouched for this caller; we are the ones saying no.
            request.setAttribute(ATTR_REFUSAL, resolution)
            return
        }
        val user = resolution.user
        val authorities = resolution.roles.map { SimpleGrantedAuthority("ROLE_$it") }

        SecurityContextHolder.getContext().authentication = UsernamePasswordAuthenticationToken(
            AuthenticatedUser(user.id.toString(), user.username, user.displayName),
            null,
            authorities
        )
    }
}
