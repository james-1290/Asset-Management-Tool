package com.assetmanagement.api.config

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import tools.jackson.core.JsonParser
import tools.jackson.databind.DeserializationContext
import tools.jackson.databind.cfg.DateTimeFeature
import tools.jackson.databind.deser.std.StdDeserializer
import tools.jackson.databind.module.SimpleModule
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

@Configuration
class JacksonConfig {

    /**
     * Layers the lenient date deserializers onto Spring Boot's auto-configured
     * mapper via a customizer, instead of replacing it with a hand-built one. A
     * hand-built mapper discards everything Boot applies from `spring.jackson.*`
     * — most importantly `default-property-inclusion: non_null`, without which
     * null fields are serialized — as well as the Kotlin module and
     * `write-dates-as-timestamps: false`.
     *
     * Spring Boot 4 moved to Jackson 3 (`tools.jackson`), which replaced
     * `Jackson2ObjectMapperBuilderCustomizer` with this interface and takes
     * deserializers through a module rather than `deserializerByType`.
     */
    @Bean
    fun flexibleDateDeserializers(): JsonMapperBuilderCustomizer =
        JsonMapperBuilderCustomizer { builder ->
            // Dates go over the wire as ISO-8601 strings, never epoch numbers.
            // Jackson 3 moved this off SerializationFeature, so it can no longer
            // be set through `spring.jackson.*`.
            builder.disable(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS)
            val module = SimpleModule("flexible-dates")
            module.addDeserializer(Instant::class.java, FlexibleInstantDeserializer())
            module.addDeserializer(LocalDate::class.java, FlexibleLocalDateDeserializer())
            builder.addModule(module)
        }
}

/**
 * Deserializer that accepts both ISO-8601 instants ("2026-02-20T00:00:00Z")
 * and plain date strings ("2026-02-20") for Instant fields.
 */
class FlexibleInstantDeserializer : StdDeserializer<Instant>(Instant::class.java) {
    override fun deserialize(p: JsonParser, ctxt: DeserializationContext): Instant {
        val text = p.string.trim()
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
        val text = p.string.trim()
        val datePart = if (text.length >= 10 && (text.contains('T') || text.contains('t'))) {
            text.substring(0, 10)
        } else {
            text
        }
        return LocalDate.parse(datePart)
    }
}
