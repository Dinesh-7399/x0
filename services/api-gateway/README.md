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
- `config/routes.yaml` - Route definitions
- `config/rate-limits.yaml` - Rate limiting rules

## API Endpoints
- `GET /health` - Gateway health check
- `GET /metrics` - Prometheus metrics
- `/api/v1/*` - Proxied to backend services

## Port Configuration
- HTTP: 80 (development) / 443 (production with TLS)
- Metrics: 9090

## Environment Variables
See `.env.example`

## Development
```bash
bun run dev
```

## Testing
```bash
bun run test           # Unit tests
bun run test:load      # Load testing
```

## Architecture
```
Client → API Gateway → Service Discovery → Backend Services
         ↓
    [Middleware Stack]
    - CORS
    - Rate Limiting
    - JWT Validation
    - Circuit Breaking
    - Request Logging
    - Metrics Collection
```
