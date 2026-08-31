package com.assetmanagement.api.integration

import com.assetmanagement.api.service.ScheduledRunClaimService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import java.util.concurrent.Callable
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * The alert scheduler runs in-process on every instance, so on Azure App
 * Service scaled to two or more each would fire the same run at the same moment
 * and every recipient would get duplicate alert emails. Exactly one instance
 * must win each window.
 */
class ScheduledRunClaimIntegrationTest : AbstractIntegrationTest() {

    @Autowired
    private lateinit var claims: ScheduledRunClaimService

    @Test
    fun `only one caller wins a run window, however many race for it`() {
        val runKey = "window-${System.nanoTime()}"
        val racers = 8
        val pool = Executors.newFixedThreadPool(racers)
        val start = CountDownLatch(1)

        try {
            val tasks = (1..racers).map {
                Callable {
                    start.await(5, TimeUnit.SECONDS)
                    claims.claim("alerts", runKey)
                }
            }
            val futures = tasks.map { pool.submit(it) }
            start.countDown()
            val wins = futures.count { it.get(20, TimeUnit.SECONDS) }

            assertEquals(1, wins, "exactly one instance should run a given window")
        } finally {
            pool.shutdownNow()
        }
    }

    @Test
    fun `a later window is claimable again`() {
        val first = "window-${System.nanoTime()}"
        val second = "window-${System.nanoTime()}-next"

        assertTrue(claims.claim("alerts", first), "the first window should be claimable")
        assertTrue(!claims.claim("alerts", first), "the same window should not be claimable twice")
        assertTrue(claims.claim("alerts", second), "the next window should be claimable")
    }

    @Test
    fun `different jobs do not block each other in the same window`() {
        val runKey = "window-${System.nanoTime()}"
        assertTrue(claims.claim("alerts", runKey))
        assertTrue(claims.claim("some-other-job", runKey), "an unrelated job should be unaffected")
    }
}
