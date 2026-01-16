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
