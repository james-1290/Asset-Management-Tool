plugins {
    // Line and branch coverage, so "the tests cover the code" is a number
    // rather than an impression.
    jacoco
    id("org.springframework.boot") version "4.1.1"
    id("io.spring.dependency-management") version "1.1.7"
    kotlin("jvm") version "2.4.10"
    kotlin("plugin.spring") version "2.4.10"
    kotlin("plugin.jpa") version "2.4.10"
}

group = "com.assetmanagement"
version = "1.0.0"

java {
    sourceCompatibility = JavaVersion.VERSION_21
}

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-mail")

    // Kotlin
    // Spring Boot 4 ships Jackson 3, whose artifacts live under the `tools.jackson`
    // group. The old com.fasterxml module would sit on the classpath doing nothing,
    // and Kotlin data classes would fail to deserialise.
    implementation("tools.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    // Database
    runtimeOnly("com.mysql:mysql-connector-j")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-mysql")
    // Boot 4 split auto-configuration out of the core jar. Without this module
    // Flyway is on the classpath but never runs, so the app starts against an
    // unmigrated database and Hibernate's `validate` fails on the first table.
    implementation("org.springframework.boot:spring-boot-flyway")

    // Microsoft Graph API (email via Entra ID)
    implementation("com.microsoft.graph:microsoft-graph:6.21.0")
    implementation("com.azure:azure-identity:1.15.0")

    // Azure Blob Storage for attachments: App Service container storage is
    // ephemeral, so uploads cannot live on local disk in a real deployment.
    implementation("com.azure:azure-storage-blob:12.29.0")

    // CSV
    implementation("com.opencsv:opencsv:5.9")

    // File content detection
    implementation("org.apache.tika:tika-core:2.9.1")

    // API Docs
    // 2.8.6 is the floor for Spring Boot 4: on 2.6.0 the app starts and the
    // routes register, but /v3/api-docs throws while building the spec. Swagger
    // is disabled by default (SWAGGER_ENABLED), so nothing surfaces that until
    // someone turns it on — OpenApiDocsIntegrationTest pins it instead.
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.6")

    // BCrypt (included via spring-security)

    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    // Spring Boot 4 split the monolith: RestTemplate and RestTemplateBuilder now
    // live in their own module rather than coming with the core starters.
    implementation("org.springframework.boot:spring-boot-restclient")
    testImplementation("org.springframework.security:spring-security-test")
    // Pin a recent Testcontainers (newer docker-java) for Docker Desktop compatibility;
    // overrides the version Spring Boot would otherwise manage.
    testImplementation(platform("org.testcontainers:testcontainers-bom:2.0.5"))
    // Testcontainers 2.x renamed every module with a `testcontainers-` prefix.
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-mysql")
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict")
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
    // Local-only escape hatch, no longer needed as of Testcontainers 2.x (its
    // newer docker-java negotiates correctly against Docker Engine 29). Kept for
    // anyone on an older daemon: when DOCKER_API_VERSION is set (e.g. on Docker
    // Desktop, whose MinAPIVersion can reject docker-java's default negotiation),
    // pin docker-java's API version. Unset in CI, so default negotiation is used.
    System.getenv("DOCKER_API_VERSION")?.let { systemProperty("api.version", it) }
}

jacoco {
    toolVersion = "0.8.12"
}

tasks.test {
    finalizedBy(tasks.jacocoTestReport)
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        xml.required.set(true)
        html.required.set(true)
    }
    classDirectories.setFrom(
        files(classDirectories.files.map {
            fileTree(it) {
                // Generated and declarative code: DTOs and entities are data
                // holders, and configuration classes are exercised by the app
                // starting at all. Counting them inflates the number without
                // saying anything about whether the logic is tested.
                exclude(
                    "**/dto/**",
                    "**/model/**",
                    "**/AssetManagementApiApplication*",
                )
            }
        })
    )
}

/**
 * Coverage including the running application.
 *
 * `jacocoTestReport` only sees the test JVM, so the controllers looked 19%
 * covered while the API suites were exercising every one of them against the
 * running jar. This merges an execution file produced by the agent attached to
 * that jar (see scripts/qa/full_sweep.sh) with the test run's own.
 */
tasks.register<JacocoReport>("jacocoRuntimeReport") {
    group = "verification"
    description = "Coverage from the unit/integration tests plus the running API."
    executionData.setFrom(
        files(
            layout.buildDirectory.file("jacoco/test.exec"),
            file("/tmp/jacoco-api.exec"),
        ).filter { it.exists() }
    )
    sourceDirectories.setFrom(files("src/main/kotlin"))
    classDirectories.setFrom(
        files(layout.buildDirectory.dir("classes/kotlin/main")).map {
            fileTree(it) { exclude("**/dto/**", "**/model/**", "**/AssetManagementApiApplication*") }
        }
    )
    reports {
        xml.required.set(true)
        html.required.set(true)
    }
}
