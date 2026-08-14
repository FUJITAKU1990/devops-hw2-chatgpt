FROM node:20-alpine

WORKDIR /app

# 1. Build context is now root, so we just setup the specific service
WORKDIR /app/services/api-gateway
COPY services/api-gateway/package.json services/api-gateway/package-lock.json ./
RUN npm ci --no-audit --maxsockets=1

COPY services/api-gateway/ .

CMD ["npm", "start"]
