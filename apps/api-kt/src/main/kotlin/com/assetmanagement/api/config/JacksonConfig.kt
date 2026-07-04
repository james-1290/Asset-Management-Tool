package com.assetmanagement.api.config

import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.databind.DeserializationContext
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.databind.deser.std.StdDeserializer
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.kotlinModule
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

@Configuration
class JacksonConfig {

    @Bean
    fun objectMapper(): ObjectMapper {
        val timeModule = JavaTimeModule().apply {
            addDeserializer(Instant::class.java, FlexibleInstantDeserializer())
            addDeserializer(LocalDate::class.java, FlexibleLocalDateDeserializer())
        }
        return ObjectMapper().apply {
            registerModule(kotlinModule())
            registerModule(timeModule)
            disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
        }
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
