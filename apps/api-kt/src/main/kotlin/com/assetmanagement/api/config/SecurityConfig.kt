package com.assetmanagement.api.config

import com.assetmanagement.api.security.JwtAuthenticationFilter
import com.assetmanagement.api.security.SamlAuthSuccessHandler
import com.assetmanagement.api.security.ScimAuthFilter
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
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
    private var samlAuthSuccessHandler: SamlAuthSuccessHandler? = null

    @Autowired(required = false)
    private var scimAuthFilter: ScimAuthFilter? = null

    @Bean
    @Order(1)
    @ConditionalOnProperty(name = ["saml.enabled"], havingValue = "true")
    fun samlFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .securityMatcher("/saml2/**", "/login/saml2/**")
            .cors { it.configurationSource(corsConfig.corsConfigurationSource()) }
            .csrf { it.disable() }
            .saml2Login { saml ->
                saml.successHandler(samlAuthSuccessHandler)
            }
            .saml2Metadata { }

        http.headers { headers ->
            headers.frameOptions { it.deny() }
            headers.contentTypeOptions { }
            headers.httpStrictTransportSecurity { hsts ->
                hsts.includeSubDomains(true)
                hsts.maxAgeInSeconds(31536000)
            }
            headers.referrerPolicy { it.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN) }
            headers.permissionsPolicy { it.policy("camera=(), microphone=(), geolocation=(), payment=()") }
        }

        return http.build()
    }

    @Bean
    @Order(2)
    fun apiFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .cors { it.configurationSource(corsConfig.corsConfigurationSource()) }
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .exceptionHandling { exceptions ->
                exceptions.authenticationEntryPoint { _, response, _ ->
                    response.status = HttpServletResponse.SC_UNAUTHORIZED
                    response.contentType = "application/json"
                    response.writer.write("""{"error":"Authentication required"}""")
                }
            }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/api/v1/auth/login").permitAll()
                    .requestMatchers("/api/v1/auth/sso-config").permitAll()
                    .requestMatchers("/api/v1/health").permitAll()
                    .apply { if (scimEnabled) requestMatchers("/scim/v2/**").permitAll() }
                    .apply { if (swaggerEnabled) requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll() }
                    .anyRequest().authenticated()
            }
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)

        http.headers { headers ->
            headers.frameOptions { it.deny() }
            headers.contentTypeOptions { }
            headers.xssProtection { it.headerValue(org.springframework.security.web.header.writers.XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK) }
            headers.httpStrictTransportSecurity { hsts ->
                hsts.includeSubDomains(true)
                hsts.maxAgeInSeconds(31536000)
            }
            headers.referrerPolicy { it.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN) }
            headers.permissionsPolicy { it.policy("camera=(), microphone=(), geolocation=(), payment=()") }
            headers.contentSecurityPolicy { it.policyDirectives("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'") }
        }

        // CSRF disabled: Stateless JWT auth doesn't use cookies for auth.
        // Not vulnerable to form-based CSRF. Re-evaluate if cookie auth is added.

        scimAuthFilter?.let { filter ->
            http.addFilterBefore(filter, JwtAuthenticationFilter::class.java)
        }

        return http.build()
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()
}
