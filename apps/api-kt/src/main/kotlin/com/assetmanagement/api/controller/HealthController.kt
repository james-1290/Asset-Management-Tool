package com.assetmanagement.api.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant

@RestController
@RequestMapping("/api/v1/health")
class HealthController {

    @GetMapping
    fun get(): Map<String, Any> = mapOf(
        "status" to "healthy",
        "timestamp" to Instant.now()
    )
}
