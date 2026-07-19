package com.assetmanagement.api.config

import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.databind.DeserializationContext
import com.fasterxml.jackson.databind.deser.std.StdDeserializer
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

@Configuration
class JacksonConfig {

    /**
     * Layer the lenient date deserializers onto Spring Boot's auto-configured
     * ObjectMapper via a customizer, instead of replacing it with a hand-built
     * one. The previous `objectMapper()` bean discarded everything Boot applies
     * from `spring.jackson.*` — most importantly `default-property-inclusion:
     * non_null` (so null fields were being serialized) — as well as the Kotlin
     * module and `write-dates-as-timestamps: false`. Those are all preserved now.
     */
    @Bean
    fun flexibleDateDeserializers(): Jackson2ObjectMapperBuilderCustomizer =
        Jackson2ObjectMapperBuilderCustomizer { builder ->
            builder.deserializerByType(Instant::class.java, FlexibleInstantDeserializer())
            builder.deserializerByType(LocalDate::class.java, FlexibleLocalDateDeserializer())
        }
}

/**
 * Deserializer that accepts both ISO-8601 instants ("2026-02-20T00:00:00Z")
 * and plain date strings ("2026-02-20") for Instant fields.
 */
class FlexibleInstantDeserializer : StdDeserializer<Instant>(Instant::class.java) {
    override fun deserialize(p: JsonParser, ctxt: DeserializationContext): Instant {
        val text = p.text.trim()
        return if (text.contains('T') || text.contains('t')) {
            Instant.parse(text)
        } else {
            LocalDate.parse(text).atStartOfDay(ZoneOffset.UTC).toInstant()
        }
    }
}

/**
 * Deserializer for date-only fields that accepts both a plain date ("2026-02-20")
 * and a full ISO instant ("2026-02-20T00:00:00Z") — the latter for backwards
 * compatibility with older clients — by keeping only the calendar date.
 */
class FlexibleLocalDateDeserializer : StdDeserializer<LocalDate>(LocalDate::class.java) {
    override fun deserialize(p: JsonParser, ctxt: DeserializationContext): LocalDate {
        val text = p.text.trim()
        val datePart = if (text.length >= 10 && (text.contains('T') || text.contains('t'))) {
            text.substring(0, 10)
        } else {
            text
        }
        return LocalDate.parse(datePart)
    }
}
