# Multi-stage build: compile with the Gradle wrapper, ship only a JRE and the
# fat jar. The build stage is discarded, so the runtime image carries no JDK,
# Gradle cache or source.

FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /build
# Copy the wrapper and build scripts first so dependency resolution is cached
# and only re-runs when the build definition actually changes.
COPY gradle gradle
COPY gradlew build.gradle.kts settings.gradle.kts* ./
RUN ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true
COPY src src
RUN ./gradlew --no-daemon bootJar

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Run as a non-root user: nothing in the app needs root, and App Service does
# not require it.
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /build/build/libs/asset-management-api-1.0.0.jar app.jar
RUN mkdir -p /app/uploads && chown -R app:app /app
USER app

# Report readiness, not just liveness: without this an orchestrator keeps
# sending traffic to a container whose process is up but whose application is
# wedged. The runtime image is Alpine, so busybox wget is already present — no
# extra package, and nothing added to the attack surface.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:5115/api/v1/health || exit 1

EXPOSE 5115

# SIGTERM triggers Spring's graceful shutdown (see server.shutdown in
# application.yml), letting in-flight requests finish before the JVM exits.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
