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

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY server.js db.js ./
COPY --from=builder /app/dist ./dist

EXPOSE 3003

CMD ["node", "server.js"]
