package com.assetmanagement.api.service

import org.springframework.stereotype.Service
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

@Service
class LoginRateLimitService {

    companion object {
        private const val MAX_ATTEMPTS = 5
        private const val LOCKOUT_DURATION_SECONDS = 900L // 15 minutes
        // Cap the in-memory map so a spray of distinct keys can't grow it without bound.
        private const val MAX_TRACKED_KEYS = 10_000
    }

    private data class AttemptRecord(val count: Int, val firstAttemptAt: Instant, val lockedUntil: Instant?)

    private val attempts = ConcurrentHashMap<String, AttemptRecord>()

    fun isBlocked(key: String): Boolean {
        val record = attempts[key] ?: return false
        if (record.lockedUntil != null && Instant.now().isBefore(record.lockedUntil)) {
            return true
        }
        // Cleanup expired lockout
        if (record.lockedUntil != null && !Instant.now().isBefore(record.lockedUntil)) {
            attempts.remove(key)
            return false
        }
        return false
    }

    fun remainingLockoutSeconds(key: String): Long {
        val record = attempts[key] ?: return 0
        val lockedUntil = record.lockedUntil ?: return 0
        val remaining = lockedUntil.epochSecond - Instant.now().epochSecond
        return if (remaining > 0) remaining else 0
    }

    fun recordFailedAttempt(key: String) {
        val now = Instant.now()
        // Atomic read-modify-write so concurrent failed logins for the same key
        // can't lose increments and slip under the lockout threshold.
        attempts.compute(key) { _, record ->
            if (record == null || (record.lockedUntil != null && !now.isBefore(record.lockedUntil))) {
                AttemptRecord(1, now, null)
            } else {
                val newCount = record.count + 1
                val lockedUntil = if (newCount >= MAX_ATTEMPTS) now.plusSeconds(LOCKOUT_DURATION_SECONDS) else null
                AttemptRecord(newCount, record.firstAttemptAt, lockedUntil)
            }
        }
        if (attempts.size > MAX_TRACKED_KEYS) pruneStale(now)
    }

    fun recordSuccessfulLogin(key: String) {
        attempts.remove(key)
    }

    /** Drop entries whose lockout has elapsed (or whose window has passed without lockout). */
    private fun pruneStale(now: Instant) {
        attempts.entries.removeIf { (_, r) ->
            val expiry = r.lockedUntil ?: r.firstAttemptAt.plusSeconds(LOCKOUT_DURATION_SECONDS)
            !now.isBefore(expiry)
        }
    }
}
