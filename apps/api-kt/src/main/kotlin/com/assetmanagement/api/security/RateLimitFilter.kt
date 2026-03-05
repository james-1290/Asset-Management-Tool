package com.assetmanagement.api.security

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
class RateLimitFilter : OncePerRequestFilter() {

    companion object {
        private const val MAX_REQUESTS_PER_MINUTE = 120
        private const val WINDOW_SECONDS = 60L
    }

    private data class RequestWindow(val count: AtomicInteger, val windowStart: Instant)

    private val requestCounts = ConcurrentHashMap<String, RequestWindow>()

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        // Skip rate limiting for health check
        if (request.requestURI == "/api/v1/health") {
            filterChain.doFilter(request, response)
            return
        }

        val clientIp = request.getHeader("X-Forwarded-For")?.split(",")?.firstOrNull()?.trim() ?: request.remoteAddr
        val now = Instant.now()

        val window = requestCounts.compute(clientIp) { _, existing ->
            if (existing == null || now.epochSecond - existing.windowStart.epochSecond >= WINDOW_SECONDS) {
                RequestWindow(AtomicInteger(1), now)
            } else {
                existing.count.incrementAndGet()
                existing
            }
        }!!

        if (window.count.get() > MAX_REQUESTS_PER_MINUTE) {
            response.status = 429
            response.contentType = "application/json"
            response.writer.write("""{"error":"Rate limit exceeded. Try again later."}""")
            return
        }

        response.setHeader("X-RateLimit-Limit", MAX_REQUESTS_PER_MINUTE.toString())
        response.setHeader("X-RateLimit-Remaining", (MAX_REQUESTS_PER_MINUTE - window.count.get()).coerceAtLeast(0).toString())

        filterChain.doFilter(request, response)
    }
}
