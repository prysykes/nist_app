#!/bin/bash

# Exit on error, undefined variables, and pipe failures
set -euo pipefail

# Color output for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting NIST AVCAS Application...${NC}"

# Function to log with timestamp
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR] [$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING] [$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Ensure resource directories exist
log "Creating resource directories..."
mkdir -p nist_trecvid_resources/cluster_csv
mkdir -p nist_trecvid_resources/videos
mkdir -p nist_trecvid_resources/youtube_files_json
mkdir -p nist_trecvid_resources/youtube_files_txt

# Wait for database to be ready
log "Waiting for database to be ready..."
max_retries=30
counter=0

until python manage.py check --database default > /dev/null 2>&1; do
    counter=$((counter + 1))
    if [ $counter -gt $max_retries ]; then
        error "Database did not become ready in time"
        exit 1
    fi
    warning "Waiting for database... (attempt $counter/$max_retries)"
    sleep 2
done

log "Database is ready!"

# Collect static files
log "Collecting static files..."
python manage.py collectstatic --noinput --clear || {
    error "Failed to collect static files"
    exit 1
}

# Check for new migrations
log "Checking for database migrations..."
if python manage.py makemigrations --dry-run --check > /dev/null 2>&1; then
    log "No new migrations to create"
else
    warning "New migrations detected, creating them..."
    python manage.py makemigrations || {
        error "Failed to create migrations"
        exit 1
    }
fi

# Apply database migrations
log "Applying database migrations..."
python manage.py migrate --noinput || {
    error "Failed to apply migrations"
    exit 1
}

# Verify static files
log "Verifying static files directory..."
if [ -d "/app/staticfiles" ]; then
    file_count=$(find /app/staticfiles -type f | wc -l)
    log "Static files collected: $file_count files"
else
    warning "Static files directory not found"
fi

# Calculate optimal number of workers
# Using 1 worker to ensure in-memory upload progress tracking works
# across requests (progress tracker is not shared between processes).
# For multi-worker support, migrate to a shared backend (Redis/DB).
WORKERS=1
log "Starting Gunicorn with $WORKERS worker..."

# Start Gunicorn with production settings
exec gunicorn nist_app.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers $WORKERS \
    --threads 4 \
    --worker-class gthread \
    --worker-connections 1000 \
    --max-requests 10000 \
    --max-requests-jitter 1000 \
    --timeout 60 \
    --graceful-timeout 30 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    --capture-output \
    --enable-stdio-inheritance
