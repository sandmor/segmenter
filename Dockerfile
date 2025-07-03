# Multi-stage build for production deployment
FROM node:20-alpine AS frontend-builder

# Build frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm run build

# Python backend stage
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app

# Set working directory
WORKDIR /app

# Copy and install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY backend/ ./backend/
COPY configs/ ./configs/
COPY checkpoints/ ./checkpoints/
COPY download_models.sh ./

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Make scripts executable and set ownership
RUN chmod +x download_models.sh \
    && chown -R app:app /app

# Switch to non-root user
USER app

# Create startup script with better error handling
RUN echo '#!/bin/bash\n\
    set -e\n\
    cd /app\n\
    \n\
    # Function to check if model exists\n\
    check_model() {\n\
    local model_variant=${SAM2_MODEL:-tiny}\n\
    local checkpoint_file="checkpoints/sam2.1_hiera_${model_variant}.pt"\n\
    if [ "$model_variant" = "base_plus" ]; then\n\
    checkpoint_file="checkpoints/sam2.1_hiera_base_plus.pt"\n\
    fi\n\
    echo "$checkpoint_file"\n\
    }\n\
    \n\
    # Download models if needed\n\
    checkpoint_file=$(check_model)\n\
    if [ ! -f "$checkpoint_file" ]; then\n\
    echo "Downloading model: ${SAM2_MODEL:-tiny}"\n\
    ./download_models.sh "${SAM2_MODEL:-tiny}"\n\
    fi\n\
    \n\
    # Start the application\n\
    # Start the application
    exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8000' > start.sh && chmod +x start.sh

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["./start.sh"]
