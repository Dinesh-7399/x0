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
docker-compose up -d

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

### Services (22 Total)

| Service | Description |
|---------|-------------|
| **api-gateway** | Entry point for all requests |
| **identity-service** | Authentication & sessions |
| **user-service** | User profiles & accounts |
| **gym-service** | Gym management |
| **membership-service** | Membership plans & subscriptions |
| **trainer-service** | Trainer profiles & scheduling |
| **workout-service** | Workout tracking & routines |
| **nutrition-service** | Nutrition plans & tracking |
| **attendance-service** | Check-in/check-out tracking |
| **payment-service** | Payment processing |
| **order-service** | Order management |
| **notification-service** | Push, email, SMS notifications |
| **chat-service** | Real-time messaging |
| **message-store-service** | Message persistence |
| **feed-service** | Activity feeds |
| **post-service** | Social posts & content |
| **social-service** | Social features & connections |
| **media-service** | Image/video upload & processing |
| **analytics-service** | Business analytics & reporting |
| **marketplace-service** | Marketplace features |
| **scanner-service** | QR/barcode scanning |
| **instant-session-service** | Drop-in session booking |

### Engines (15 Total)

Business logic engines for complex domain operations:

| Engine | Description |
|--------|-------------|
| **billing-engine** | Invoice generation & billing cycles |
| **pricing-engine** | Dynamic pricing calculations |
| **discount-engine** | Discount rules & promotions |
| **commission-engine** | Trainer/partner commissions |
| **cancellation-engine** | Membership cancellation handling |
| **capacity-engine** | Gym capacity management |
| **inventory-engine** | Equipment & product inventory |
| **gamification-engine** | Points, badges, leaderboards |
| **matching-engine** | Trainer-client matching |
| **geofencing-engine** | Location-based features |
| **fraud-detection-engine** | Fraud prevention |
| **churn-prediction-engine** | Member churn prediction |
| **nutrition-engine** | Nutrition calculations |
| **workout-generator-engine** | AI workout generation |
| **notification-intelligence-engine** | Smart notification timing |

### Shared Packages (8 Total)

| Package | Description |
|---------|-------------|
| **@gymato/types** | Shared TypeScript types |
| **@gymato/errors** | Error handling utilities |
| **@gymato/utils** | Common utility functions |
| **@gymato/database** | Database connection & helpers |
| **@gymato/messaging** | Message queue utilities |
| **@gymato/validation** | Input validation schemas |
| **@gymato/observability** | Logging, metrics, tracing |
| **@gymato/testing** | Test utilities & mocks |

## 📁 Project Structure

```
gymato/
├── services/          # 22 microservices
├── engines/           # 15 business logic engines
├── packages/          # 8 shared libraries
├── infrastructure/    # Docker, K8s, monitoring configs
├── docs/              # Architecture documentation
└── tools/             # Scripts and generators
```

## 🧪 Testing

```bash
bun run test           # Run all tests
bun run test:watch     # Watch mode
bun run test:coverage  # Coverage report
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Runtime** | Bun |
| **Language** | TypeScript |
| **Database** | PostgreSQL |
| **Cache** | Redis |
| **Queue** | RabbitMQ |
| **API Framework** | Hono |
| **Testing** | Bun Test |
| **Linting** | Biome |
| **Monorepo** | Turborepo |
| **Observability** | Prometheus, Grafana, Jaeger |

## 🔧 Development Scripts

```bash
bun run dev              # Start all services
bun run dev:gateway      # Start API Gateway only
bun run dev:identity     # Start Identity Service only
bun run build            # Build all services
bun run test             # Run all tests
bun run lint             # Lint code
bun run lint:fix         # Auto-fix lint issues
bun run format           # Format code
bun run typecheck        # Type check
bun run docker:up        # Start infrastructure
bun run docker:down      # Stop infrastructure
bun run generate:service # Generate new service
bun run health           # Check services health
```

## 🐳 Docker

```bash
# Start all services with Docker
docker-compose up -d

# Rebuild and start
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop all
docker-compose down
```

### Service Ports

| Service | Port |
|---------|------|
| API Gateway | 80 |
| Identity Service | 8081 |
| User Service | 8082 |
| PostgreSQL | 5432 |
| Redis | 6379 |

## 📚 Documentation

- [Architecture Overview](docs/architecture/00-overview.md)
- [API Gateway Design](docs/architecture/adr/001-api-gateway-pattern.md)
- [API Documentation](docs/api/)
- [Development Guide](docs/guides/local-development.md)

## 📄 License

Private - All Rights Reserved
