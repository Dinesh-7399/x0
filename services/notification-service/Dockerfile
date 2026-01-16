# Build stage
FROM oven/bun:1.0.25-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json bun.lockb ./
COPY services/notification-service/package.json ./services/notification-service/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY services/notification-service ./services/notification-service
COPY packages ./packages

# Build
RUN bun run build --filter=notification-service

# Production stage
FROM oven/bun:1.0.25-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/services/notification-service/dist ./dist
COPY --from=builder /app/services/notification-service/package.json ./


# Install production dependencies only
RUN bun install --production --frozen-lockfile

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S bunuser -u 1001
USER bunuser

EXPOSE 8080

CMD ["bun", "run", "start"]
