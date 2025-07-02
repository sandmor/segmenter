#!/bin/bash
# Production Deployment Script
# Usage: ./deploy.sh [domain] [model_variant]

set -e

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | sed 's/#.*//g' | xargs)
fi

# Configuration
export DOMAIN=${1:-"localhost"}
export MODEL=${2:-"${MODEL:-tiny}"}
export PORT=${PORT:-80}

echo "Starting deployment for $DOMAIN with model $MODEL..."

# Download models if they don't exist
if [ ! -f "checkpoints/sam2.1_hiera_${MODEL}.pt" ]; then
    echo "Downloading SAM2 model: $MODEL"
    ./download_models.sh "$MODEL"
fi

# Set CORS origins based on domain
if [ "$DOMAIN" != "localhost" ]; then
    export CORS_ORIGINS="https://$DOMAIN,http://$DOMAIN,https://www.$DOMAIN,http://www.$DOMAIN"
else
    export CORS_ORIGINS="http://localhost:$PORT,http://localhost:8000"
fi

# Build and run with Docker Compose
echo "Building and running Docker container..."
docker-compose up --build -d

echo "Waiting for application to start..."
sleep 10

# Health check
if docker-compose exec segmenter curl -f "http://localhost:8000/health" > /dev/null; then
    echo "Deployment complete."
    if [ "$DOMAIN" != "localhost" ]; then
        echo "Access at: https://$DOMAIN"
    else
        echo "Access at: http://localhost:$PORT"
    fi
else
    echo "Health check failed. Check container logs:"
    echo "  docker-compose logs"
    exit 1
fi
