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

EXPOSE 5115

# SIGTERM triggers Spring's graceful shutdown (see server.shutdown in
# application.yml), letting in-flight requests finish before the JVM exits.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
