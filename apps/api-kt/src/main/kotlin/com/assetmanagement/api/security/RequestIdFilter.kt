package com.assetmanagement.api.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.MDC
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.util.UUID

/**
 * Tags every log line written while handling a request with the same id.
 *
 * Errors already carry an id, but ordinary log lines did not, so reconstructing
 * what happened during one user's request meant guessing from timestamps — hard
 * on a quiet system and impossible on a busy one.
 *
 * An inbound `X-Request-Id` is honoured (with anything unreasonable discarded)
 * so a trace started at the load balancer or by a caller carries through, and
 * the id is echoed back on the response so a report can quote it.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
class RequestIdFilter : OncePerRequestFilter() {

    companion object {
        const val HEADER = "X-Request-Id"
        const val MDC_KEY = "requestId"
        private const val MAX_LENGTH = 64
        private val SAFE = Regex("^[A-Za-z0-9._-]+$")
    }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        // A caller-supplied id goes into the logs, so it must not be able to
        // carry newlines or arbitrary text into them.
        val supplied = request.getHeader(HEADER)
        val id = if (supplied != null && supplied.length <= MAX_LENGTH && SAFE.matches(supplied)) {
            supplied
        } else {
            UUID.randomUUID().toString()
        }

        MDC.put(MDC_KEY, id)
        response.setHeader(HEADER, id)
        try {
            filterChain.doFilter(request, response)
        } finally {
            // Threads are pooled; leaving the id behind would mislabel the next
            // request handled on this one.
            MDC.remove(MDC_KEY)
        }
    }
}
