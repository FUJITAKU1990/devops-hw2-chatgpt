FROM node:20-alpine

WORKDIR /app

# 1. Copy and Build the Shared Database Package
WORKDIR /app/database
COPY database/package.json database/package-lock.json ./
RUN npm ci --no-audit --maxsockets=1
COPY database/ ./
RUN npm run build

# 2. Copy and Build the Shared Mail Package
WORKDIR /app/packages/mail
COPY packages/mail/package.json packages/mail/package-lock.json ./
RUN npm ci --no-audit --maxsockets=1
COPY packages/mail/ ./
RUN npm run build

# 3. Build the Service
WORKDIR /app/services/auth-service
COPY services/auth-service/package.json services/auth-service/package-lock.json ./
RUN npm ci --no-audit --maxsockets=1

COPY services/auth-service/ .

CMD ["npm", "start"]
