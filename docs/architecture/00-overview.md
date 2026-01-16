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
