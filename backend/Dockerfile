# DonorKhoj backend — production image (EC2 / any Docker host)
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    ENV=production \
    PORT=8000

WORKDIR /app

# System deps for asyncpg/psycopg2 builds + healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# App code (models excluded via .dockerignore; mounted/downloaded separately if needed)
COPY . .

# Run as non-root
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -fsS http://127.0.0.1:${PORT}/health || exit 1

# Gunicorn + Uvicorn workers. Tune --workers to vCPU count (2n+1 rule).
CMD ["sh", "-c", "gunicorn main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT} --workers 3 --timeout 300 --graceful-timeout 30 --access-logfile - --error-logfile -"]
