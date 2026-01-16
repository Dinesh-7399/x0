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
