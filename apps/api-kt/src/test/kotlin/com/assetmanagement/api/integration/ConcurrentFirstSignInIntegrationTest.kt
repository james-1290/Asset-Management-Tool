package com.assetmanagement.api.integration

import com.assetmanagement.api.repository.UserRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * A user's very first sign-in arrives as a burst: the SPA issues several
 * requests in parallel as it loads, and each one carries an identity that has no
 * row yet. Without care every one of them tries to insert, all but one hit the
 * unique constraint, and the user is bounced as unauthenticated on their first
 * ever visit.
 */
class ConcurrentFirstSignInIntegrationTest @Autowired constructor(
    private val userRepository: UserRepository,
) : AbstractIntegrationTest() {

    @Test
    fun `parallel first requests provision exactly one user and all succeed`() {
        // An identity nothing else in the suite signs in as, so this really is a
        // first sign-in.
        val username = "dev-racer@localhost"
        assertEquals(null, userRepository.findByUsername(username), "precondition: the racer must not exist yet")

        val redirect = restNoRedirect.exchange(
            "/.auth/login/aad?identity=racer", HttpMethod.GET,
            HttpEntity<Void>(HttpHeaders()), String::class.java
        )
        val session = redirect.headers[HttpHeaders.SET_COOKIE].orEmpty()
            .first { it.startsWith("AppServiceAuthSession=") }.substringBefore(";")

        val parallelism = 8
        val pool = Executors.newFixedThreadPool(parallelism)
        try {
            val calls = List(parallelism) {
                Callable {
                    rest.exchange(
                        "/api/v1/auth/me", HttpMethod.GET,
                        HttpEntity<Void>(HttpHeaders().apply { add(HttpHeaders.COOKIE, session) }),
                        String::class.java
                    ).statusCode.value()
                }
            }
            val statuses = pool.invokeAll(calls).map { it.get(30, TimeUnit.SECONDS) }

            assertTrue(
                statuses.all { it == 200 },
                "every concurrent first request should authenticate, got $statuses"
            )
        } finally {
            pool.shutdownNow()
        }

        assertEquals(
            1, userRepository.findAll().count { it.username == username },
            "the racing requests must not create duplicate users"
        )
    }
}
