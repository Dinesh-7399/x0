#!/bin/bash

# Gymato Monorepo Structure Generator with API Gateway
# Usage: bash create-repo-structure.sh

set -e  # Exit on error

echo "🏗️  Creating Gymato Monorepo Structure..."

# Root directory

# GitHub workflows
mkdir -p .github/workflows

# Services (21 services - includes API Gateway)
services=(
  "api-gateway"                # ← THE GATEWAY (runs on port 443/80)
  "identity-service"
  "user-service"
  "gym-service"
  "membership-service"
  "attendance-service"
  "trainer-service"
  "workout-service"
  "nutrition-service"
  "chat-service"
  "message-store-service"
  "social-service"
  "post-service"
  "feed-service"
  "notification-service"
  "media-service"
  "marketplace-service"
  "order-service"
  "payment-service"
  "scanner-service"
  "analytics-service"
  "instant-session-service"
)

for service in "${services[@]}"; do
  echo "📦 Creating $service..."
  
  # Special structure for API Gateway
  if [ "$service" = "api-gateway" ]; then
    mkdir -p "services/$service/src"/{config,core,middleware,plugins/{authentication,transformation,caching},proxy,health,versioning}
    mkdir -p "services/$service/config"
    mkdir -p "services/$service/tests"/{unit,integration,load}
  else
    # Standard microservice structure
    mkdir -p "services/$service/src"/{config,domain/{entities,value-objects,repositories},application/{commands,queries,handlers},infrastructure/{database/{migrations,seeds},security,messaging},interfaces/{http/{routes,controllers,middleware,dto},grpc},shared/{errors,constants}}
    mkdir -p "services/$service/tests"/{unit/{domain,application},integration,e2e}
  fi
  
  # Create package.json for each service
  if [ "$service" = "api-gateway" ]; then
    cat > "services/$service/package.json" <<EOF
{
  "name": "$service",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir=dist --target=bun",
    "start": "bun dist/index.js",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^3.12.8",
    "zod": "^3.22.4",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "yaml": "^2.3.4",
    "@gymato/observability": "workspace:*",
    "@gymato/types": "workspace:*",
    "@gymato/errors": "workspace:*",
    "@gymato/utils": "workspace:*"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.5",
    "bun-types": "^1.0.25"
  }
}
EOF
  else
    cat > "services/$service/package.json" <<EOF
{
  "name": "$service",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir=dist --target=bun",
    "start": "bun dist/index.js",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^3.12.8",
    "zod": "^3.22.4",
    "@gymato/database": "workspace:*",
    "@gymato/messaging": "workspace:*",
    "@gymato/observability": "workspace:*",
    "@gymato/types": "workspace:*",
    "@gymato/validation": "workspace:*",
    "@gymato/errors": "workspace:*",
    "@gymato/utils": "workspace:*"
  },
  "devDependencies": {
    "bun-types": "^1.0.25"
  }
}
EOF
  fi

  # Create tsconfig.json
  cat > "services/$service/tsconfig.json" <<EOF
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF

  # Create .env.example
  if [ "$service" = "api-gateway" ]; then
    cat > "services/$service/.env.example" <<EOF
# API Gateway Config
PORT=80
HTTPS_PORT=443
NODE_ENV=development

# JWT Validation
JWT_SECRET=your-secret-key

# Redis (for rate limiting & caching)
REDIS_URL=redis://localhost:6379

# Service Discovery
SERVICE_REGISTRY_TTL=60

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=30000

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# Timeouts
DEFAULT_TIMEOUT=5000
UPLOAD_TIMEOUT=30000

# Observability
LOG_LEVEL=info
METRICS_PORT=9090
EOF
  else
    cat > "services/$service/.env.example" <<EOF
# Service Config
PORT=8080
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/$service

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=15m

# Observability
LOG_LEVEL=info
METRICS_PORT=9090
EOF
  fi

  # Create basic index.ts
  if [ "$service" = "api-gateway" ]; then
    cat > "services/$service/src/index.ts" <<EOF
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint (for Prometheus)
app.get('/metrics', (c) => {
  return c.text('# API Gateway Metrics\\n# TODO: Implement metrics');
});

// API routes will be dynamically loaded from routes.yaml
app.all('/api/*', (c) => {
  return c.json({ 
    error: 'Route configuration not loaded',
    message: 'Implement route loading from config/routes.yaml'
  }, 503);
});

const port = process.env.PORT || 80;

console.log(\`🚪 API Gateway running on http://localhost:\${port}\`);
console.log(\`📊 Metrics available at http://localhost:\${port}/metrics\`);

export default {
  port,
  fetch: app.fetch,
};
EOF
  else
    cat > "services/$service/src/index.ts" <<EOF
import { Hono } from 'hono';
import { logger } from 'hono/logger';

const app = new Hono();

app.use('*', logger());

app.get('/health', (c) => {
  return c.json({ status: 'healthy', service: '$service' });
});

const port = process.env.PORT || 8080;

console.log(\`🚀 $service running on http://localhost:\${port}\`);

export default {
  port,
  fetch: app.fetch,
};
EOF
  fi

  # Create routes.yaml for API Gateway
  if [ "$service" = "api-gateway" ]; then
    cat > "services/$service/config/routes.yaml" <<EOF
version: "1.0"

# Route definitions for API Gateway
routes:
  # Authentication (no auth required)
  - path: /api/v1/auth/register
    method: POST
    target: identity-service:8080
    stripPrefix: /api/v1
    auth: false
    rateLimit:
      points: 5
      duration: 60

  - path: /api/v1/auth/login
    method: POST
    target: identity-service:8080
    stripPrefix: /api/v1
    auth: false
    rateLimit:
      points: 10
      duration: 60

  - path: /api/v1/auth/refresh
    method: POST
    target: identity-service:8080
    stripPrefix: /api/v1
    auth: false

  # User Management (requires auth)
  - path: /api/v1/users/*
    method: [GET, PUT, PATCH, DELETE]
    target: user-service:8081
    stripPrefix: /api/v1
    auth: true
    rateLimit:
      points: 100
      duration: 60

  # Gym Management
  - path: /api/v1/gyms/*
    method: [GET, POST, PUT, DELETE]
    target: gym-service:8082
    stripPrefix: /api/v1
    auth: true

  # Chat (WebSocket)
  - path: /api/v1/chat/*
    target: chat-service:8083
    stripPrefix: /api/v1
    protocol: websocket
    auth: true

  # Media Uploads
  - path: /api/v1/media/upload
    method: POST
    target: media-service:8084
    stripPrefix: /api/v1
    auth: true
    maxBodySize: 50MB
    timeout: 30000

  # Public endpoints (cached)
  - path: /api/v1/gyms/search
    method: GET
    target: gym-service:8082
    stripPrefix: /api/v1
    auth: false
    cache:
      enabled: true
      ttl: 300
EOF

    cat > "services/$service/config/rate-limits.yaml" <<EOF
version: "1.0"

# Rate limiting configuration
global:
  default: 1000/hour

tiers:
  anonymous:
    default: 100/hour
    burst: 20
  
  authenticated:
    default: 1000/hour
    burst: 50
  
  premium:
    default: 10000/hour
    burst: 200
  
  admin:
    default: unlimited

endpoints:
  /api/v1/auth/login:
    limit: 10/minute
    lockout: 5 minutes after 5 failures
  
  /api/v1/auth/register:
    limit: 5/hour per IP
  
  /api/v1/media/upload:
    limit: 50/hour
    maxSize: 50MB
EOF
  fi

  # Create Dockerfile
  cat > "services/$service/Dockerfile" <<EOF
# Build stage
FROM oven/bun:1.0.25-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json bun.lockb ./
COPY services/$service/package.json ./services/$service/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY services/$service ./services/$service
COPY packages ./packages

# Build
RUN bun run build --filter=$service

# Production stage
FROM oven/bun:1.0.25-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/services/$service/dist ./dist
COPY --from=builder /app/services/$service/package.json ./
$([ "$service" = "api-gateway" ] && echo "COPY --from=builder /app/services/$service/config ./config")

# Install production dependencies only
RUN bun install --production --frozen-lockfile

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S bunuser -u 1001
USER bunuser

EXPOSE $([ "$service" = "api-gateway" ] && echo "80 443" || echo "8080")

CMD ["bun", "run", "start"]
EOF

  # Create README
  if [ "$service" = "api-gateway" ]; then
    cat > "services/$service/README.md" <<EOF
# API Gateway

## Description
Central entry point for all client requests. Handles routing, authentication, rate limiting, and load balancing.

## Responsibilities
- Route requests to appropriate microservices
- JWT validation and authentication
- Rate limiting (per user, per IP, per endpoint)
- Circuit breaking (fail fast when services are down)
- Request/response transformation
- Load balancing across service instances
- Service discovery and health checking
- API versioning (/v1, /v2)
- WebSocket proxy for real-time features
- Response caching
- CORS handling
- Request logging and metrics

## Configuration Files
- \`config/routes.yaml\` - Route definitions
- \`config/rate-limits.yaml\` - Rate limiting rules

## API Endpoints
- \`GET /health\` - Gateway health check
- \`GET /metrics\` - Prometheus metrics
- \`/api/v1/*\` - Proxied to backend services

## Port Configuration
- HTTP: 80 (development) / 443 (production with TLS)
- Metrics: 9090

## Environment Variables
See \`.env.example\`

## Development
\`\`\`bash
bun run dev
\`\`\`

## Testing
\`\`\`bash
bun run test           # Unit tests
bun run test:load      # Load testing
\`\`\`

## Architecture
\`\`\`
Client → API Gateway → Service Discovery → Backend Services
         ↓
    [Middleware Stack]
    - CORS
    - Rate Limiting
    - JWT Validation
    - Circuit Breaking
    - Request Logging
    - Metrics Collection
\`\`\`
EOF
  else
    cat > "services/$service/README.md" <<EOF
# $service

## Description
[Add service description]

## Responsibilities
- [Responsibility 1]
- [Responsibility 2]

## API Endpoints
- \`GET /health\` - Health check

## Dependencies
- Database: PostgreSQL
- Cache: Redis
- Queue: RabbitMQ

## Environment Variables
See \`.env.example\`

## Development
\`\`\`bash
bun run dev
\`\`\`

## Testing
\`\`\`bash
bun run test
\`\`\`
EOF
  fi
done

# Engines (15 engines)
engines=(
  "pricing-engine"
  "discount-engine"
  "commission-engine"
  "billing-engine"
  "cancellation-engine"
  "inventory-engine"
  "matching-engine"
  "capacity-engine"
  "geofencing-engine"
  "gamification-engine"
  "fraud-detection-engine"
  "notification-intelligence-engine"
  "workout-generator-engine"
  "nutrition-engine"
  "churn-prediction-engine"
)

for engine in "${engines[@]}"; do
  echo "⚙️  Creating $engine..."
  mkdir -p "engines/$engine/src"/{types,calculators,utils}
  mkdir -p "engines/$engine/tests"
  
  cat > "engines/$engine/package.json" <<EOF
{
  "name": "@gymato/$engine",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.22.4",
    "@gymato/types": "workspace:*",
    "@gymato/errors": "workspace:*"
  },
  "devDependencies": {
    "bun-types": "^1.0.25"
  }
}
EOF

  cat > "engines/$engine/src/index.ts" <<EOF
// Export public API for $engine
export * from './types';
EOF

  cat > "engines/$engine/README.md" <<EOF
# $engine

## Purpose
[Add engine purpose]

## Usage
\`\`\`typescript
import { SomeFunction } from '@gymato/$engine';

const result = SomeFunction(input);
\`\`\`

## Testing
\`\`\`bash
bun test
\`\`\`
EOF
done

# Packages (8 shared libraries)
packages=(
  "database"
  "messaging"
  "observability"
  "types"
  "validation"
  "errors"
  "utils"
  "testing"
)

for package in "${packages[@]}"; do
  echo "📚 Creating @gymato/$package..."
  mkdir -p "packages/$package/src"
  mkdir -p "packages/$package/tests"
  
  cat > "packages/$package/package.json" <<EOF
{
  "name": "@gymato/$package",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "bun-types": "^1.0.25"
  }
}
EOF

  cat > "packages/$package/src/index.ts" <<EOF
// Export public API for @gymato/$package
EOF
done

# Infrastructure
mkdir -p infrastructure/docker/{services,databases/{postgres,redis,mongodb,neo4j}}
mkdir -p infrastructure/kubernetes/{namespaces,services,deployments,configmaps,secrets}
mkdir -p infrastructure/monitoring/{prometheus,grafana/{dashboards,datasources},jaeger}

# Documentation
mkdir -p docs/{architecture/adr,api,guides,diagrams}

# Create initial architecture docs
cat > docs/architecture/00-overview.md <<'EOF'
# Gymato Architecture Overview

## System Architecture
```
┌─────────────┐
│   Clients   │ (Mobile App, Web Browser)
└──────┬──────┘
       │ HTTPS
       ↓
┌─────────────────────────────────────┐
│        API GATEWAY (Port 80)        │
│  ┌───────────────────────────────┐  │
│  │ - CORS                        │  │
│  │ - Rate Limiting               │  │
│  │ - JWT Validation              │  │
│  │ - Circuit Breaking            │  │
│  │ - Load Balancing              │  │
│  └───────────────────────────────┘  │
└──────────┬──────────────────────────┘
           │
    ┌──────┴──────┬──────────┬─────────┐
    ↓             ↓          ↓         ↓
┌────────┐  ┌─────────┐  ┌──────┐  ┌──────┐
│Identity│  │   User  │  │ Gym  │  │ Chat │
│Service │  │ Service │  │Service│  │Service│
└────────┘  └─────────┘  └──────┘  └──────┘
    │            │           │         │
    └────────────┴───────────┴─────────┘
                 │
         ┌───────┴────────┐
         ↓                ↓
    ┌──────────┐    ┌─────────┐
    │PostgreSQL│    │  Redis  │
    └──────────┘    └─────────┘
```

## Services (21 Total)

1. **api-gateway** - Central routing and authentication
2. **identity-service** - User authentication
3. **user-service** - User profiles
4. **gym-service** - Gym management
5. ... (17 more services)

## Technology Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **API Framework**: Hono
- **Databases**: PostgreSQL, Redis, MongoDB, Neo4j
- **Message Queue**: RabbitMQ
- **Monitoring**: Prometheus, Grafana, Jaeger

## Key Design Decisions

See [ADR Directory](./adr/) for detailed decision records.
EOF

cat > docs/architecture/adr/001-api-gateway-pattern.md <<'EOF'
# ADR 001: API Gateway Pattern

## Status
Accepted

## Context
We need a single entry point for all client requests to:
- Centralize authentication
- Implement rate limiting
- Handle service discovery
- Provide load balancing
- Enable circuit breaking

## Decision
Implement custom API Gateway using Hono/Bun instead of using Kong/Traefik.

## Consequences

### Positive
- Full control over routing logic
- Deep understanding of gateway patterns
- No external dependencies
- TypeScript consistency
- Easy to customize

### Negative
- More code to maintain
- Need to implement patterns from scratch
- Less battle-tested than Kong

## Alternatives Considered

### Kong API Gateway
- Pros: Production-ready, plugin ecosystem
- Cons: Another technology to learn, less control
- Rejected: We want to learn patterns deeply

### Traefik
- Pros: Cloud-native, automatic service discovery
- Cons: Configuration complexity
- Rejected: Less learning opportunity

## Implementation Notes
- Route configuration in YAML (routes.yaml)
- JWT validation at gateway level
- Services receive trusted headers (X-User-ID)
- Circuit breaker per service
- Redis for rate limiting state
EOF

# Tools
mkdir -p tools/{generators,scripts,linters}

# VS Code
mkdir -p .vscode

# Husky
mkdir -p .husky

# Root files
echo "📝 Creating root configuration files..."

# Root package.json
cat > package.json <<'EOF'
{
  "name": "gymato",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "services/*",
    "engines/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev --parallel",
    "dev:gateway": "turbo run dev --filter=api-gateway",
    "dev:identity": "turbo run dev --filter=identity-service",
    "build": "turbo run build",
    "test": "turbo run test",
    "test:watch": "turbo run test:watch",
    "test:coverage": "turbo run test:coverage",
    "lint": "biome check .",
    "lint:fix": "biome check --apply .",
    "format": "biome format --write .",
    "typecheck": "turbo run typecheck",
    "docker:up": "cd infrastructure/docker && docker-compose up -d",
    "docker:down": "cd infrastructure/docker && docker-compose down",
    "migrate": "bun run tools/scripts/run-migrations.ts",
    "seed": "bun run tools/scripts/seed-data.ts",
    "generate:service": "bun run tools/generators/create-service.ts",
    "health": "bun run tools/scripts/check-health.ts"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.5.3",
    "@types/node": "^20.11.5",
    "husky": "^8.0.3",
    "lint-staged": "^15.2.0",
    "turbo": "^1.11.3",
    "typescript": "^5.3.3"
  }
}
EOF

# tsconfig.json
cat > tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "incremental": true,
    "types": ["bun-types"],
    "paths": {
      "@gymato/*": ["packages/*/src"]
    }
  },
  "exclude": ["node_modules", "dist", "build"]
}
EOF

# turbo.json
cat > turbo.json <<'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
EOF

# biome.json
cat > biome.json <<'EOF'
{
  "$schema": "https://biomejs.dev/schemas/1.5.3/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "error"
      },
      "style": {
        "useConst": "error",
        "useTemplate": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingComma": "all",
      "semicolons": "always"
    }
  }
}
EOF

# .gitignore
cat > .gitignore <<'EOF'
# Dependencies
node_modules/
bun.lockb

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
.idea/

# Testing
coverage/
.nyc_output/

# Temp
tmp/
temp/
EOF

# README.md
cat > README.md <<'EOF'
# 🏋️ Gymato

Enterprise-grade gym management platform built with microservices architecture.

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) >= 1.0.25
- [Docker](https://www.docker.com/) >= 24.0
- [PostgreSQL](https://www.postgresql.org/) >= 15

### Installation
```bash
# Install dependencies
bun install

# Start infrastructure (databases, queues)
bun run docker:up

# Run migrations
bun run migrate

# Seed data
bun run seed

# Start all services in development mode
bun run dev

# Or start specific services
bun run dev:gateway    # API Gateway
bun run dev:identity   # Identity Service
```

## 🏗️ Architecture

### Request Flow
```
Client → API Gateway (Port 80) → Backend Services (Ports 8080+)
```

The API Gateway handles:
- Authentication (JWT validation)
- Rate limiting
- Circuit breaking
- Load balancing
- Service discovery

### Services (21 Total)
1. **api-gateway** - Entry point for all requests
2. **identity-service** - Authentication & sessions
3. **user-service** - User profiles
4. **gym-service** - Gym management
... (17 more)

See [Architecture Docs](docs/architecture/00-overview.md) for details.

## 📁 Project Structure
```
gymato/
├── services/          # 21 microservices (includes api-gateway)
├── engines/           # 15 business logic engines
├── packages/          # 8 shared libraries
├── infrastructure/    # Docker, K8s, monitoring
├── docs/             # Architecture documentation
└── tools/            # Scripts and generators
```

## 🧪 Testing
```bash
# Run all tests
bun run test

# Watch mode
bun run test:watch

# Coverage
bun run test:coverage
```

## 📚 Documentation

- [Architecture Overview](docs/architecture/00-overview.md)
- [API Gateway Design](docs/architecture/adr/001-api-gateway-pattern.md)
- [API Documentation](docs/api/)
- [Development Guide](docs/guides/local-development.md)

## 🛠️ Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript (migrating to Go later)
- **Database**: PostgreSQL (raw SQL with pg, no ORM)
- **Cache**: Redis
- **Queue**: RabbitMQ
- **API Framework**: Hono
- **Gateway**: Custom (TypeScript/Bun)
- **Testing**: Bun Test
- **Observability**: Prometheus, Grafana, Jaeger

## 🔧 Development Scripts
```bash
bun run dev              # Start all services
bun run dev:gateway      # Start API Gateway only
bun run dev:identity     # Start Identity Service only
bun run build            # Build all services
bun run test             # Run all tests
bun run lint             # Lint code
bun run typecheck        # Type check
bun run docker:up        # Start infrastructure
bun run docker:down      # Stop infrastructure
```

## 📄 License

Private - Learning Project
EOF

# CONTRIBUTING.md
cat > CONTRIBUTING.md <<'EOF'
# Contributing to Gymato

## Development Workflow

1. Create a feature branch
2. Make changes
3. Run tests: `bun run test`
4. Run linter: `bun run lint`
5. Commit with conventional commits
6. Push and create PR

## Code Style

- Use TypeScript strict mode
- Follow Biome rules
- Write tests for new features
- Document public APIs

## Architecture Principles

1. **Single Responsibility**: Each service handles ONE domain
2. **DRY**: Engines contain shared business logic
3. **Clean Architecture**: Domain → Application → Infrastructure → Interface
4. **API Gateway First**: All client requests go through gateway
5. **No ORMs**: Use raw SQL for learning and performance

## Creating a New Service
```bash
bun run generate:service
```

## Running Migrations
```bash
bun run migrate
```

## API Gateway Configuration

- Routes: `services/api-gateway/config/routes.yaml`
- Rate Limits: `services/api-gateway/config/rate-limits.yaml`
EOF

# VS Code settings
cat > .vscode/settings.json <<'EOF'
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
EOF

cat > .vscode/extensions.json <<'EOF'
{
  "recommendations": [
    "biomejs.biome",
    "oven.bun-vscode",
    "ms-azuretools.vscode-docker",
    "rangav.vscode-thunder-client"
  ]
}
EOF

echo "✅ Repository structure created successfully!"
echo ""
echo "📊 Statistics:"
echo "   - Services: 21 (includes api-gateway)"
echo "   - Engines: 15"
echo "   - Packages: 8"
echo "   - Total: 44 components"
echo ""
echo "📋 Next steps:"
echo "1. cd gymato"
echo "2. bun install"
echo "3. bun run docker:up"
echo "4. bun run dev:gateway    # Start API Gateway"
echo "5. bun run dev:identity   # Start Identity Service"
echo ""
echo "🚪 API Gateway will run on http://localhost:80"
echo "🔑 Identity Service will run on http://localhost:8080"
echo ""
echo "🎉 Happy coding!"