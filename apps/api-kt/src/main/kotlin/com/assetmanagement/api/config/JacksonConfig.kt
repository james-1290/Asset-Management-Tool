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
