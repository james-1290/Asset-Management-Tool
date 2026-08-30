package com.assetmanagement.api.security

import com.assetmanagement.api.util.ClientIpResolver
import org.springframework.beans.factory.annotation.Value
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

@Component
@Order(1)
class RateLimitFilter(
    private val clientIpResolver: ClientIpResolver,
    // Configurable so local development and the e2e suite — which drive far more
    // traffic from a single IP than any real user — aren't throttled into flaky
    // failures. The production default is unchanged.
    @Value("\${security.rate-limit.requests-per-minute:120}")
    private val maxRequestsPerMinute: Int,
) : OncePerRequestFilter() {

    companion object {
        private const val WINDOW_SECONDS = 60L
        // Cap the map so a spray of distinct client IPs can't grow it without bound.
        private const val MAX_TRACKED_KEYS = 50_000
    }

    private data class RequestWindow(val count: AtomicInteger, val windowStart: Instant)

    private val requestCounts = ConcurrentHashMap<String, RequestWindow>()

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        // Skip rate limiting for health checks / orchestrator probes.
        val uri = request.requestURI
        if (uri == "/api/v1/health" || uri.startsWith("/actuator/health")) {
            filterChain.doFilter(request, response)
            return
        }

        val clientIp = clientIpResolver.resolve(request)
        val now = Instant.now()

        if (requestCounts.size > MAX_TRACKED_KEYS) {
            requestCounts.entries.removeIf { now.epochSecond - it.value.windowStart.epochSecond >= WINDOW_SECONDS }
        }

        val window = requestCounts.compute(clientIp) { _, existing ->
            if (existing == null || now.epochSecond - existing.windowStart.epochSecond >= WINDOW_SECONDS) {
                RequestWindow(AtomicInteger(1), now)
            } else {
                existing.count.incrementAndGet()
                existing
            }
        }!!

        if (window.count.get() > maxRequestsPerMinute) {
            response.status = 429
            response.contentType = "application/json"
            response.writer.write("""{"error":"Rate limit exceeded. Try again later."}""")
            return
        }

        response.setHeader("X-RateLimit-Limit", maxRequestsPerMinute.toString())
        response.setHeader("X-RateLimit-Remaining", (maxRequestsPerMinute - window.count.get()).coerceAtLeast(0).toString())

        filterChain.doFilter(request, response)
    }

}
