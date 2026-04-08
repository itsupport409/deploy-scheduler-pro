# Build stage: install deps and build frontend
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Run stage: production image
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3003
# Writable path for SQLite (Cloud Run only allows /tmp to be written)
ENV DATA_DIR=/tmp/data
# Session secret - MUST be set in Cloud Run environment variables
ENV SESSION_SECRET=${SESSION_SECRET:-change-this-in-production}

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY server.js db.js ./
COPY --from=builder /app/dist ./dist

EXPOSE 3003

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "server.js"]
