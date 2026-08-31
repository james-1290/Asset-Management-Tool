plugins {
    // Line and branch coverage, so "the tests cover the code" is a number
    // rather than an impression.
    jacoco
    id("org.springframework.boot") version "3.3.7"
    id("io.spring.dependency-management") version "1.1.6"
    kotlin("jvm") version "2.4.10"
    kotlin("plugin.spring") version "1.9.23"
    kotlin("plugin.jpa") version "1.9.23"
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
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    // Database
    runtimeOnly("com.mysql:mysql-connector-j")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-mysql")

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
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0")

    // BCrypt (included via spring-security)

    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    // Pin a recent Testcontainers (newer docker-java) for Docker Desktop compatibility;
    // overrides the older version Spring Boot 3.2 would otherwise manage.
    testImplementation(platform("org.testcontainers:testcontainers-bom:1.20.4"))
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:mysql")
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict")
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
    // Local-only escape hatch: when DOCKER_API_VERSION is set (e.g. on Docker
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
