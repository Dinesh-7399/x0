#!/bin/bash
# Run all Gymato database migrations
# Usage: ./scripts/run-migrations.sh

set -e

echo "🚀 Running Gymato Database Migrations..."

SERVICES=(
    "identity-service/migrations/001_create_users.sql"
    "identity-service/migrations/002_create_2fa_and_history.sql"
    "user-service/migrations/001_create_profiles.sql"
    "gym-service/migrations/001_create_gym_tables.sql"
    "gym-service/migrations/002_add_verification_tables.sql"
    "trainer-service/migrations/001_create_trainer_tables.sql"
    "chat-service/migrations/001_create_chat_tables.sql"
    "social-service/migrations/001_create_social_tables.sql"
    "feed-service/migrations/001_create_feed_tables.sql"
    "payment-service/migrations/001_create_payment_tables.sql"
    "media-service/migrations/001_create_media_tables.sql"
    "workout-service/migrations/001_create_workout_tables.sql"
    "notification-service/migrations/001_create_notification_tables.sql"
    "attendance-service/migrations/001_initial_schema.sql"
)

for migration in "${SERVICES[@]}"; do
    echo "📦 Running: $migration"
    docker exec -i gymato-postgres psql -U gymato -d gymato < "services/$migration" 2>/dev/null || echo "  ⚠️  Already exists or error (continuing...)"
done

echo ""
echo "✅ Migrations complete!"
echo ""
echo "Restarting services..."
docker-compose restart

echo ""
echo "Waiting for health checks..."
sleep 10

echo ""
echo "Service Status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep gymato
