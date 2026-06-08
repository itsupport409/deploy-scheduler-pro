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
# Firebase Admin SDK credentials (JSON string of service account key)
# Set this in Cloud Run environment variables — do NOT hardcode here
# ENV FIREBASE_SERVICE_ACCOUNT2={}

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY server.js ./
COPY --from=builder /app/dist ./dist

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "server.js"]
