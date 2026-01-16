# Build stage
FROM oven/bun:1.0.25-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json bun.lockb ./
COPY services/order-service/package.json ./services/order-service/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY services/order-service ./services/order-service
COPY packages ./packages

# Build
RUN bun run build --filter=order-service

# Production stage
FROM oven/bun:1.0.25-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/services/order-service/dist ./dist
COPY --from=builder /app/services/order-service/package.json ./


# Install production dependencies only
RUN bun install --production --frozen-lockfile

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S bunuser -u 1001
USER bunuser

EXPOSE 8080

CMD ["bun", "run", "start"]
