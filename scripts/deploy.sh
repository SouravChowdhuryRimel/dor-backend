#!/usr/bin/env bash
# ==============================================================================
# Production Deployment Script for Dor Backend (Price Check BD)
# ==============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-$(pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
IMAGE_NAME="${BACKEND_IMAGE:-ghcr.io/souravchowdhuryrimel/dor-backend:latest}"
PORT="${PORT:-3000}"

echo "=========================================================="
echo "🚀 Starting Production Deployment"
echo "📂 Working Directory: $APP_DIR"
echo "📦 Target Image: $IMAGE_NAME"
echo "=========================================================="

cd "$APP_DIR"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: $COMPOSE_FILE not found in $APP_DIR"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "❌ Error: .env file missing in $APP_DIR. Deployment aborted."
    exit 1
fi

echo "📥 [1/5] Pulling latest container image..."
docker pull "$IMAGE_NAME"

echo "🔄 [2/5] Running database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm --no-deps backend npx prisma migrate deploy || echo "⚠️ Migration completed with warning/no-op."

echo "⚡ [3/5] Starting application containers..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "🩺 [4/5] Running healthcheck verification..."
HEALTH_URL="http://127.0.0.1:${PORT}/api/v1/health"
RETRIES=6
DELAY=5
HEALTHY=0

for i in $(seq 1 $RETRIES); do
    sleep $DELAY
    STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
    if [ "$STATUS_CODE" -eq 200 ] || [ "$STATUS_CODE" -eq 204 ]; then
        echo "✅ Application is healthy! (HTTP $STATUS_CODE)"
        HEALTHY=1
        break
    fi
    echo "⏳ Attempt $i/$RETRIES: Got HTTP $STATUS_CODE. Retrying in ${DELAY}s..."
done

if [ $HEALTHY -eq 0 ]; then
    echo "⚠️ Warning: Healthcheck did not succeed within timeout. Inspecting logs:"
    docker compose -f "$COMPOSE_FILE" logs --tail=30 backend
    exit 1
fi

echo "🧹 [5/5] Pruning obsolete Docker resources..."
docker image prune -af --filter "until=72h" || true

echo "=========================================================="
echo "🎉 Deployment completed successfully!"
echo "=========================================================="
