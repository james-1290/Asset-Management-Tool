package com.assetmanagement.api.integration

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.MySQLContainer
import org.testcontainers.utility.DockerImageName

/**
 * Base for full-stack integration tests: boots the whole Spring context against a
 * throwaway MySQL container, so Flyway migrates from clean and Hibernate's
 * `ddl-auto: validate` runs against a real schema on every test run.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
abstract class AbstractIntegrationTest {

    @Autowired
    protected lateinit var rest: TestRestTemplate

    /** POST JSON, returning the raw String body + status via ResponseEntity. */
    protected fun postJson(path: String, body: String, token: String? = null) =
        rest.exchange(path, HttpMethod.POST, jsonEntity(body, token), String::class.java)

    protected fun getWithToken(path: String, token: String?) =
        rest.exchange(path, HttpMethod.GET, HttpEntity<Void>(authHeaders(token)), String::class.java)

    protected fun putJson(path: String, body: String, token: String? = null) =
        rest.exchange(path, HttpMethod.PUT, jsonEntity(body, token), String::class.java)

    protected fun jsonEntity(body: String, token: String? = null): HttpEntity<String> {
        val headers = authHeaders(token)
        headers.contentType = MediaType.APPLICATION_JSON
        return HttpEntity(body, headers)
    }

    private fun authHeaders(token: String?): HttpHeaders {
        val headers = HttpHeaders()
        if (token != null) headers.setBearerAuth(token)
        return headers
    }

    /** Log in as admin/admin123 and return the JWT. */
    protected fun loginAsAdmin(): String = login("admin", "admin123")

    /** Log in as an arbitrary user and return the JWT. */
    protected fun login(username: String, password: String): String {
        val resp = postJson("/api/v1/auth/login", """{"username":"$username","password":"$password"}""")
        val body = resp.body ?: error("no login body")
        return Regex("\"token\"\\s*:\\s*\"([^\"]+)\"").find(body)?.groupValues?.get(1)
            ?: error("no token in login response: $body")
    }

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
