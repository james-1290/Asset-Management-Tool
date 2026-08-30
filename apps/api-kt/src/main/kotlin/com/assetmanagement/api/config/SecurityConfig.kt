package com.assetmanagement.api.config

import com.assetmanagement.api.security.CsrfCookieFilter
import com.assetmanagement.api.security.EasyAuthPrincipalFilter
import com.assetmanagement.api.security.JwtAuthenticationFilter
import com.assetmanagement.api.security.LocalEasyAuthEmulatorFilter
import com.assetmanagement.api.security.ScimAuthFilter
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.annotation.Order
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.csrf.CookieCsrfTokenRepository
import org.springframework.security.web.csrf.CsrfFilter
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler
import org.springframework.security.web.util.matcher.AntPathRequestMatcher
import org.springframework.security.web.util.matcher.RequestMatcher
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter
import jakarta.servlet.http.HttpServletResponse

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class SecurityConfig(
    private val jwtAuthenticationFilter: JwtAuthenticationFilter,
    private val corsConfig: CorsConfig,
    @Value("\${scim.enabled:false}") private val scimEnabled: Boolean,
    @Value("\${springdoc.api-docs.enabled:false}") private val swaggerEnabled: Boolean
) {

    @Autowired(required = false)
    private var scimAuthFilter: ScimAuthFilter? = null

    @Autowired(required = false)
    private var easyAuthPrincipalFilter: EasyAuthPrincipalFilter? = null

    @Autowired(required = false)
    private var localEasyAuthEmulatorFilter: LocalEasyAuthEmulatorFilter? = null

    /**
     * Requests that carry an `Authorization` header authenticate by bearer token,
     * not by cookie, so they cannot be forged cross-site: a browser will not
     * attach a custom header to a cross-origin request without a CORS preflight
     * this API does not grant. Exempting them keeps machine callers (SCIM)
     * working while the browser session — which *is* cookie-borne and therefore
     * forgeable — stays protected.
     */
    private val bearerAuthenticated = RequestMatcher { request ->
        request.getHeader("Authorization")?.startsWith("Bearer ") == true
    }

    @Bean
    @Order(2)
    fun apiFilterChain(http: HttpSecurity): SecurityFilterChain {
        // Opting out of the deferred-token attribute name makes the token
        // available eagerly, which is what a JSON API + SPA needs (there is no
        // template render to trigger it) and keeps the plain-token contract the
        // browser echoes back in X-XSRF-TOKEN.
        val csrfRequestHandler = CsrfTokenRequestAttributeHandler().apply {
            setCsrfRequestAttributeName(null)
        }

        http
            .cors { it.configurationSource(corsConfig.corsConfigurationSource()) }
            // Authentication is now the platform's session COOKIE (Azure App
            // Service built-in auth), which browsers attach to cross-site
            // requests — exactly the condition CSRF protection exists for. The
            // previous stateless-JWT design did not need it; this one does.
            .csrf { csrf ->
                csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                    .csrfTokenRequestHandler(csrfRequestHandler)
                    .ignoringRequestMatchers(
                        bearerAuthenticated,
                        // Sign-in/sign-out are the platform's own endpoints and
                        // carry no application state; on App Service they never
                        // reach this container at all.
                        AntPathRequestMatcher("/.auth/**"),
                        // Local password login: an unauthenticated endpoint with
                        // no session to ride on, so there is nothing for a forged
                        // request to escalate. Goes away with local login itself.
                        AntPathRequestMatcher("/api/v1/auth/login", "POST")
                    )
            }
            .addFilterAfter(CsrfCookieFilter(), CsrfFilter::class.java)
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .exceptionHandling { exceptions ->
                exceptions.authenticationEntryPoint { request, response, _ ->
                    // A caller the platform authenticated but the app refused
                    // gets 403, not 401: sending them back to the identity
                    // provider would succeed and return them here again,
                    // unchanged — an endless redirect loop. 403 lets the client
                    // explain the problem instead.
                    val refused = request.getAttribute(EasyAuthPrincipalFilter.ATTR_REFUSED) == true
                    response.contentType = "application/json"
                    if (refused) {
                        response.status = HttpServletResponse.SC_FORBIDDEN
                        response.writer.write(
                            """{"error":"Your account has no role assigned for this application. Ask an administrator to assign you a role.","code":"no_role_assigned"}"""
                        )
                    } else {
                        response.status = HttpServletResponse.SC_UNAUTHORIZED
                        response.writer.write("""{"error":"Authentication required"}""")
                    }
                }
            }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/api/v1/auth/login").permitAll()
                    .requestMatchers("/api/v1/auth/sso-config").permitAll()
                    // Local Easy Auth emulator only — in Azure these paths are
                    // answered by the platform and never reach this container.
                    .apply { if (localEasyAuthEmulatorFilter != null) requestMatchers("/.auth/**").permitAll() }
                    .requestMatchers("/api/v1/health").permitAll()
                    .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                    .apply { if (scimEnabled) requestMatchers("/scim/v2/**").permitAll() }
                    .apply { if (swaggerEnabled) requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll() }
                    .anyRequest().authenticated()
            }
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)

        http.headers { headers ->
            headers.frameOptions { it.deny() }
            headers.contentTypeOptions { }
            // Send "X-XSS-Protection: 0" — OWASP guidance is to disable the
            // legacy browser XSS auditor (removed from modern browsers, and a
            // side-channel risk where still present); the CSP below is the real
            // defence.
            headers.xssProtection { it.headerValue(org.springframework.security.web.header.writers.XXssProtectionHeaderWriter.HeaderValue.DISABLED) }
            headers.httpStrictTransportSecurity { hsts ->
                hsts.includeSubDomains(true)
                hsts.maxAgeInSeconds(31536000)
            }
            headers.referrerPolicy { it.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN) }
            headers.permissionsPolicy { it.policy("camera=(), microphone=(), geolocation=(), payment=()") }
            headers.contentSecurityPolicy { it.policyDirectives("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'") }
        }

        // Easy Auth (Azure App Service) runs ahead of the JWT filter: when the
        // platform has already authenticated the caller there is no app-issued
        // token to inspect. The JWT filter stays in the chain while both auth
        // modes coexist; it simply finds no Authorization header.
        scimAuthFilter?.let { filter ->
            http.addFilterBefore(filter, JwtAuthenticationFilter::class.java)
        }

        easyAuthPrincipalFilter?.let { filter ->
            http.addFilterBefore(filter, JwtAuthenticationFilter::class.java)

            // The local emulator stands in for the App Service auth sidecar, so
            // it has to inject its headers before the filter that reads them.
            localEasyAuthEmulatorFilter?.let { emulator ->
                http.addFilterBefore(emulator, EasyAuthPrincipalFilter::class.java)
            }
        }

        return http.build()
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()
}
