# Gymato - AI Agent Context

> **Purpose**: This document provides context for AI agents working on the Gymato codebase.

## Project Overview

**Gymato** is a comprehensive fitness platform that connects gyms, trainers, and members. It's built as a microservices monorepo using modern TypeScript/Bun architecture.

---

## Architecture

### Tech Stack
| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Language | TypeScript |
| API Framework | Hono |
| Database | PostgreSQL (via Prisma) |
| Cache | Redis |
| Message Queue | RabbitMQ (planned) |
| Container | Docker |
| Monorepo | Bun workspaces + Turbo |

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Mobile/Web Apps                     │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                      API Gateway                        │
│  • JWT Authentication    • Rate Limiting                │
│  • Request Routing       • CORS                         │
└────────────────────────────┬────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Identity   │    │    User     │    │    Gym      │
│  Service    │    │   Service   │    │   Service   │
└─────────────┘    └─────────────┘    └─────────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             ▼
                    ┌─────────────────┐
                    │    PostgreSQL   │
                    │      Redis      │
                    └─────────────────┘
```

---

## Project Structure

```
gymato/
├── services/           # Microservices (22 total)
│   ├── api-gateway/    # Entry point - routing, auth, rate limiting
│   ├── identity-service/  # Authentication (login, register, tokens)
│   ├── user-service/   # User profiles and preferences
│   ├── gym-service/    # Gym management
│   ├── membership-service/
│   ├── workout-service/
│   ├── nutrition-service/
│   ├── trainer-service/
│   ├── chat-service/   # Real-time messaging (WebSocket)
│   ├── notification-service/
│   ├── payment-service/
│   ├── media-service/  # File uploads
│   └── ... (more services)
│
├── packages/           # Shared packages (8 total)
│   ├── types/          # Shared TypeScript types
│   ├── database/       # Prisma client & migrations
│   ├── errors/         # Standard error classes
│   ├── utils/          # Common utilities
│   ├── validation/     # Zod schemas
│   ├── observability/  # Logging, metrics, tracing
│   ├── messaging/      # Event bus abstraction
│   └── testing/        # Test utilities
│
├── engines/            # Business logic engines (15 total)
│   ├── workout-engine/
│   ├── recommendation-engine/
│   └── ... (AI/ML powered features)
│
├── docker-compose.yml  # Local development setup
├── Dockerfile.service  # Generic service Dockerfile
└── turbo.json          # Monorepo build config
```

---

## Key Services

### API Gateway (`services/api-gateway`)
- **Port**: 80
- **Role**: Single entry point for all API requests
- **Features**:
  - JWT token validation
  - Route matching from `config/routes.yaml`
  - Request proxying to backend services
  - CORS, rate limiting, request logging

### Identity Service (`services/identity-service`)
- **Port**: 8080
- **Role**: Authentication and authorization
- **Features**:
  - User registration/login
  - JWT access + refresh tokens
  - Password reset flow
  - Email/phone verification
- **Domain Entities**: `User`, `RefreshToken`, `VerificationCode`, `PasswordResetToken`

### User Service (`services/user-service`)
- **Port**: 8081
- **Role**: User profile management
- **Features**: Profile CRUD, preferences, avatar upload

### Gym Service (`services/gym-service`)
- **Port**: 8082
- **Role**: Gym business management
- **Features**: Gym profiles, locations, schedules

---

## Authentication Flow

```
1. User registers → Identity Service creates User
2. User logs in → Identity Service returns:
   - Access Token (JWT, 15min expiry)
   - Refresh Token (UUID, 30 day expiry)
3. Client calls API → Gateway validates JWT
4. Token expires → Client uses refresh token to get new access token
```

### JWT Payload Structure
```typescript
interface JwtPayload {
  sub: string;      // User ID
  email: string;
  roles?: string[]; // ['member', 'trainer', 'owner']
  gymId?: string;   // Current gym context
  iat: number;      // Issued at (Unix timestamp)
  exp: number;      // Expiration (Unix timestamp)
}
```

---

## Development Commands

```bash
# Install dependencies
bun install

# Start all services (Docker)
docker-compose up -d

# Start development (Turbo)
bun run dev

# Type checking
bun run typecheck

# Run specific service
cd services/api-gateway && bun run dev
```

---

## Design Patterns

### Domain-Driven Design (Identity Service)
- **Entities**: Rich domain objects with business logic
- **Value Objects**: Immutable, self-validating (Email, Password)
- **Factories**: `User.create()`, `User.fromPersistence()`

### API Gateway Pattern
- Routes defined declaratively in YAML
- Auth requirements per-route (`auth: true/false`)
- Rate limiting per-route
- Dynamic service discovery (planned)

### Clean Architecture
```
src/
├── domain/         # Entities, Value Objects (no dependencies)
├── application/    # Use cases, DTOs
├── infrastructure/ # Database, external services
└── presentation/   # HTTP handlers
```

---

## Current Development Focus

1. ✅ API Gateway with JWT authentication
2. 🔄 Identity Service domain layer
3. ⏳ Database integration (Prisma)
4. ⏳ Inter-service communication

---

## Important Files

| File | Purpose |
|------|---------|
| `services/api-gateway/config/routes.yaml` | All API route definitions |
| `services/api-gateway/src/index.ts` | Gateway entry point |
| `services/identity-service/src/domain/entities/User.ts` | Core User entity |
| `packages/database/prisma/schema.prisma` | Database schema |
| `docker-compose.yml` | Local infrastructure |

---

## Conventions

- **Ports**: Gateway=80, Identity=8080, User=8081, Gym=8082, Chat=8083, Media=8084
- **Package imports**: `@gymato/{package-name}`
- **Error handling**: Use `@gymato/errors` classes
- **Logging**: Use `@gymato/observability` (Pino)
- **Validation**: Use Zod schemas from `@gymato/validation`
