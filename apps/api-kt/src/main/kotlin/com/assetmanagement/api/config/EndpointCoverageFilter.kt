package com.assetmanagement.api.config

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Profile
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import org.springframework.web.servlet.HandlerMapping
import java.io.File
import java.util.concurrent.ConcurrentHashMap

/**
 * Records which endpoints a test run actually reaches, so "the suites cover
 * every endpoint" can be measured instead of asserted.
 *
 * It records the *matched route pattern*, not the request URI, so
 * `/api/v1/assets/9f3c…/history` is recorded once as
 * `GET /api/v1/assets/{id}/history` however many times it is called.
 *
 * Development profiles only: this exists to measure the test suites and has no
 * place in a deployed environment.
 */
@Component
@Profile("dev", "local", "test")
@Order(Ordered.LOWEST_PRECEDENCE)
class EndpointCoverageFilter : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(EndpointCoverageFilter::class.java)
    private val seen = ConcurrentHashMap.newKeySet<String>()

    private val outputFile: File? =
        System.getProperty("endpoint.coverage.file")?.let { File(it) }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        filterChain.doFilter(request, response)

        // Read after the chain: the pattern is set once the handler is resolved.
        val pattern = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE) as? String
            ?: return
        // A 404 has no handler, and a request refused before the handler ran
        // (401/403) never reached the endpoint — neither is coverage.
        if (response.status == 404 || response.status == 401 || response.status == 403) return

        if (seen.add("${request.method} $pattern")) flush()
    }

    private fun flush() {
        val file = outputFile ?: return
        try {
            file.parentFile?.mkdirs()
            file.writeText(seen.sorted().joinToString("\n") + "\n")
        } catch (e: Exception) {
            log.debug("Could not write endpoint coverage", e)
        }
    }
}
