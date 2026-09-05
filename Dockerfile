FROM node:22-alpine AS frontend-build

WORKDIR /app/NIRIKSHAN/frontend
COPY NIRIKSHAN/frontend/package.json NIRIKSHAN/frontend/package-lock.json ./
RUN npm ci
COPY NIRIKSHAN/frontend/ ./
RUN npm run build

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    DEBUG=false \
    USE_SQLITE_FALLBACK=true

WORKDIR /app
COPY NIRIKSHAN/backend/requirements.txt ./NIRIKSHAN/backend/requirements.txt
RUN pip install --no-cache-dir -r NIRIKSHAN/backend/requirements.txt

COPY . .
COPY --from=frontend-build /app/NIRIKSHAN/frontend/dist ./NIRIKSHAN/frontend/dist

WORKDIR /app/NIRIKSHAN/backend
EXPOSE 10000
CMD ["sh", "-c", "uvicorn prototype:app --host 0.0.0.0 --port ${PORT:-10000}"]
