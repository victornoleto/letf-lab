FROM node:24-bookworm-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim AS backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g opencode-ai \
    && opencode --version \
    && rm -rf /var/lib/apt/lists/*

COPY backend/ ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .

COPY docker/backend-entrypoint.sh /usr/local/bin/backend-entrypoint.sh
RUN chmod +x /usr/local/bin/backend-entrypoint.sh

EXPOSE 8001
ENTRYPOINT ["backend-entrypoint.sh"]
CMD ["uvicorn", "ai_swing.main:app", "--host", "0.0.0.0", "--port", "8001"]

FROM nginx:1.27-alpine AS frontend

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/frontend/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80
