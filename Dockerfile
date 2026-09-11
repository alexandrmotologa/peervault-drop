# ===================================================
# PeerVault Drop - Multi-Stage Production Dockerfile
# Zero-Knowledge Secret Sharing for Telegram & Web
# ===================================================

# ---------------------------------------------------
# Stage 1: Build Web Frontend (React + Vite + Tailwind)
# ---------------------------------------------------
FROM node:22-alpine AS web-builder

WORKDIR /app/web

COPY web/package*.json ./
RUN npm ci

COPY web/ ./
RUN npm run build

# ---------------------------------------------------
# Stage 2: Build Server (TypeScript -> JavaScript)
# ---------------------------------------------------
FROM node:22-alpine AS server-builder

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
RUN npm run build

# ---------------------------------------------------
# Stage 3: Production Runtime
# ---------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV DATA_DIR=/data

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create persistent storage directory
RUN mkdir -p /data && chown -R node:node /data

# Copy production server dependencies
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built server files
COPY --from=server-builder /app/server/dist ./dist

# Copy built frontend into server static public directory
COPY --from=web-builder /app/server/dist/public ./dist/public

# Run as non-root node user
USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

VOLUME ["/data"]

CMD ["node", "dist/index.js"]
