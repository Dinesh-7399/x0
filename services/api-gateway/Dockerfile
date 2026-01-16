# Build stage
FROM oven/bun:1.0.25-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json bun.lock* ./
COPY packages/*/package.json ./packages/
COPY services/api-gateway/package.json ./services/api-gateway/

# Install dependencies
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Copy source
COPY packages ./packages
COPY services/api-gateway ./services/api-gateway

# Build
WORKDIR /app/services/api-gateway
RUN bun build src/index.ts --outdir=dist --target=bun --minify

# Production stage
FROM oven/bun:1.0.25-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S app && adduser -S -u 1001 -G app app

# Copy built files
COPY --from=builder --chown=app:app /app/services/api-gateway/dist ./dist
COPY --from=builder --chown=app:app /app/services/api-gateway/package.json ./
COPY --from=builder --chown=app:app /app/services/api-gateway/config ./config

USER app

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost:${PORT:-80}/health || exit 1

CMD ["bun", "run", "dist/index.js"]
