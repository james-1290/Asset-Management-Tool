package com.assetmanagement.api.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
class CorsConfig {

    @Value("\${cors.origins:http://localhost:5173}")
    private lateinit var origins: String

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val validOrigins = origins.split(",")
            .map { it.trim() }
            .filter { it.matches(Regex("^https?://.+$")) && it != "*" }

        val config = CorsConfiguration().apply {
            allowedOrigins = validOrigins
            allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
            allowedHeaders = listOf("Content-Type", "Authorization")
            allowCredentials = true
            maxAge = 3600
        }
        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", config)
        return source
    }
}
