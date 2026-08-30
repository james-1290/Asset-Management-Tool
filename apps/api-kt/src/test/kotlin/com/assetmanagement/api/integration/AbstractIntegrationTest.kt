package com.assetmanagement.api.integration

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.web.client.RestTemplateBuilder
import org.springframework.http.client.SimpleClientHttpRequestFactory
import java.net.HttpURLConnection
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.MySQLContainer
import org.testcontainers.utility.DockerImageName

/**
 * Base for full-stack integration tests: boots the whole Spring context against a
 * throwaway MySQL container, so Flyway migrates from clean and Hibernate's
 * `ddl-auto: validate` runs against a real schema on every test run.
 */
// The "test" profile is an explicit dev-safe profile: SecurityStartupValidator
// tolerates development settings under it instead of failing the boot (it fails
// closed on an unset/"default" profile), and it enables the Easy Auth emulator so
// tests authenticate through the same path the deployed app uses.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
abstract class AbstractIntegrationTest {

    @Autowired
    protected lateinit var rest: TestRestTemplate

    /**
     * A client that does *not* follow redirects, so a test can inspect a 302 and
     * the cookies it sets. The default [rest] follows them, which would silently
     * turn a sign-in redirect into a request for the target page.
     */
    protected val restNoRedirect: TestRestTemplate by lazy {
        val factory = object : SimpleClientHttpRequestFactory() {
            override fun prepareConnection(connection: HttpURLConnection, httpMethod: String) {
                super.prepareConnection(connection, httpMethod)
                connection.instanceFollowRedirects = false
            }
        }
        TestRestTemplate(
            RestTemplateBuilder()
                // Disambiguate: requestFactory is overloaded on Supplier and Function.
                .requestFactory(java.util.function.Supplier { factory })
                .rootUri(rest.rootUri)
        )
    }

    /**
     * Signs in the way the deployed app does — through the Easy Auth endpoint
     * (emulated under the `test` profile) — and returns the cookies to send on
     * subsequent requests: the session cookie plus the CSRF token.
     */
    protected fun signInWithCookie(identity: String = "admin"): SessionCookies {
        val redirect = restNoRedirect.exchange(
            "/.auth/login/aad?identity=$identity", HttpMethod.GET,
            HttpEntity<Void>(HttpHeaders()), String::class.java
        )
        check(redirect.statusCode.value() == 302) {
            "sign-in should redirect, got ${redirect.statusCode}: ${redirect.body}"
        }
        val session = redirect.headers[HttpHeaders.SET_COOKIE].orEmpty()
            .first { it.startsWith("AppServiceAuthSession=") }
            .substringBefore(";")

        // Any request issues the CSRF cookie; take one along with the session.
        val probe = restNoRedirect.exchange(
            "/api/v1/auth/me", HttpMethod.GET,
            HttpEntity<Void>(HttpHeaders().apply { add(HttpHeaders.COOKIE, session) }), String::class.java
        )
        val csrfCookie = probe.headers[HttpHeaders.SET_COOKIE].orEmpty()
            .firstOrNull { it.startsWith("XSRF-TOKEN=") }
            ?.substringBefore(";")

        return SessionCookies(session, csrfCookie)
    }

    protected data class SessionCookies(val session: String, val csrfCookie: String?) {
        val csrfToken: String? get() = csrfCookie?.substringAfter("XSRF-TOKEN=")

        /** Headers carrying the session, and optionally the CSRF echo header. */
        fun headers(withCsrf: Boolean = true): HttpHeaders = HttpHeaders().apply {
            add(HttpHeaders.COOKIE, session)
            csrfCookie?.let { add(HttpHeaders.COOKIE, it) }
            if (withCsrf) csrfToken?.let { add("X-XSRF-TOKEN", it) }
        }
    }

    /** POST JSON, returning the raw String body + status via ResponseEntity. */
    protected fun postJson(path: String, body: String, session: SessionCookies? = null) =
        rest.exchange(path, HttpMethod.POST, jsonEntity(body, session), String::class.java)

    protected fun putJson(path: String, body: String, session: SessionCookies? = null) =
        rest.exchange(path, HttpMethod.PUT, jsonEntity(body, session), String::class.java)

    protected fun getAs(path: String, session: SessionCookies?) =
        rest.exchange(path, HttpMethod.GET, HttpEntity<Void>(authHeaders(session)), String::class.java)

    protected fun deleteAs(path: String, session: SessionCookies?) =
        rest.exchange(path, HttpMethod.DELETE, HttpEntity<Void>(authHeaders(session)), String::class.java)

    protected fun jsonEntity(body: String, session: SessionCookies? = null): HttpEntity<String> {
        val headers = authHeaders(session)
        headers.contentType = MediaType.APPLICATION_JSON
        return HttpEntity(body, headers)
    }

    private fun authHeaders(session: SessionCookies?): HttpHeaders =
        session?.headers() ?: HttpHeaders()

    /** Sign in as an administrator. */
    protected fun loginAsAdmin(): SessionCookies = signInWithCookie("admin")

    companion object {
        // Singleton container shared across ALL integration test classes: started
        // once and never stopped (the JVM reaps it at exit). A JUnit-managed
        // `@Container` static field is stopped after the first test class, which
        // would leave the *cached* Spring context (reused by later classes with the
        // same config) pointing at a dead database — causing hangs/read-timeouts.
        @JvmStatic
        val mysql: MySQLContainer<Nothing> =
            MySQLContainer<Nothing>(DockerImageName.parse("mysql:8.3")).apply {
                withDatabaseName("assetmgmt")
                withUrlParam("serverTimezone", "UTC")
                start()
            }

        @DynamicPropertySource
        @JvmStatic
        fun datasourceProps(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url") { mysql.jdbcUrl }
            registry.add("spring.datasource.username") { mysql.username }
            registry.add("spring.datasource.password") { mysql.password }
            registry.add("spring.datasource.driver-class-name") { mysql.driverClassName }
        }
    }
}
