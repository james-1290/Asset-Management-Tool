# Asset Management Tool

A local-first, Azure-ready multi-user asset management system for IT/admin teams.

## Quick Start

Prerequisites: Docker, JDK 21, and Node.js.

```bash
# 1. Start infrastructure (PostgreSQL, MySQL, MailHog)
cd infra && docker compose up -d && cd ..

# 2. Build and start the API (in a new terminal)
cd apps/api-kt && ./gradlew build
java -jar build/libs/asset-management-api-1.0.0.jar
# Requires JDK 21 on your PATH (or set JAVA_HOME to a JDK 21 install)

# 3. Start the frontend (in a new terminal)
cd apps/web && npm install && npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5115
- API docs (Swagger UI): http://localhost:5115/swagger-ui.html
- Mail catcher (MailHog): http://localhost:8025

## Documentation

- [Setup Guide](docs/setup.md)
- [Architecture](docs/architecture.md)
- [Database Schema](docs/database.md)
- [API Reference](docs/api.md)
- [UX Guidelines](docs/ux-guidelines.md)

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Kotlin + Spring Boot (JDK 21)
- **Database**: PostgreSQL
- **Infrastructure**: Docker Compose (local), Azure (future)
