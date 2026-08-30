package com.assetmanagement.api.config

import com.assetmanagement.api.security.EasyAuthPrincipalFilter
import com.assetmanagement.api.security.RequireCustomHeaderCsrfFilter
import com.assetmanagement.api.service.EasyAuthUserService
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
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter
import jakarta.servlet.http.HttpServletResponse

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class SecurityConfig(
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

    private fun forbidden(response: HttpServletResponse, code: String, message: String) {
        response.status = HttpServletResponse.SC_FORBIDDEN
        response.writer.write("""{"error":"$message","code":"$code"}""")
    }

    @Bean
    @Order(2)
    fun apiFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .cors { it.configurationSource(corsConfig.corsConfigurationSource()) }
            // CSRF: see RequireCustomHeaderCsrfFilter. Spring's own token
            // mechanism is switched off in favour of a required custom header,
            // because the cookie token repository re-issued a new token on every
            // response here, and a rotating token breaks concurrent writes.
            .csrf { it.disable() }
            .addFilterBefore(RequireCustomHeaderCsrfFilter(), UsernamePasswordAuthenticationFilter::class.java)
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .exceptionHandling { exceptions ->
                exceptions.authenticationEntryPoint { request, response, _ ->
                    // A caller the platform authenticated but the app refused
                    // gets 403, not 401: sending them back to the identity
                    // provider would succeed and return them here again,
                    // unchanged — an endless redirect loop. 403 lets the client
                    // explain the problem instead, and the reason decides who
                    // can actually fix it.
                    response.contentType = "application/json"
                    when (request.getAttribute(EasyAuthPrincipalFilter.ATTR_REFUSAL)) {
                        is EasyAuthUserService.Resolution.NoRole -> forbidden(
                            response, "no_role_assigned",
                            "Your account has no role assigned for this application. " +
                                "Ask an administrator to assign you a role."
                        )
                        is EasyAuthUserService.Resolution.Deactivated -> forbidden(
                            response, "account_deactivated",
                            "Your access to this application has been deactivated. " +
                                "Ask an administrator to restore it."
                        )
                        is EasyAuthUserService.Resolution.Conflict -> forbidden(
                            response, "account_conflict",
                            "Your sign-in could not be matched to an account in this application. " +
                                "Ask an administrator to check for a duplicate account."
                        )
                        else -> {
                            response.status = HttpServletResponse.SC_UNAUTHORIZED
                            response.writer.write("""{"error":"Authentication required"}""")
                        }
                    }
                }
            }
            .authorizeHttpRequests { auth ->
                auth
                    // Local Easy Auth emulator only — in Azure these paths are
                    // answered by the platform and never reach this container.
                    .apply { if (localEasyAuthEmulatorFilter != null) requestMatchers("/.auth/**").permitAll() }
                    .requestMatchers("/api/v1/health").permitAll()
                    .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                    .apply { if (scimEnabled) requestMatchers("/scim/v2/**").permitAll() }
                    .apply { if (swaggerEnabled) requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll() }
                    .anyRequest().authenticated()
            }

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

        scimAuthFilter?.let { filter ->
            http.addFilterBefore(filter, UsernamePasswordAuthenticationFilter::class.java)
        }

        easyAuthPrincipalFilter?.let { filter ->
            http.addFilterBefore(filter, UsernamePasswordAuthenticationFilter::class.java)

            // The local emulator stands in for the App Service auth sidecar, so
            // it has to inject its headers before the filter that reads them.
            localEasyAuthEmulatorFilter?.let { emulator ->
                http.addFilterBefore(emulator, EasyAuthPrincipalFilter::class.java)
            }
        }

        return http.build()
    }
}
