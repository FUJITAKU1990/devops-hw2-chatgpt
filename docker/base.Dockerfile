FROM node:20-alpine

WORKDIR /app/database
COPY database/package.json database/package-lock.json ./
RUN npm ci --no-audit --maxsockets=1
COPY database/ ./
RUN npm run build

WORKDIR /app/packages/mail
COPY packages/mail/package.json packages/mail/package-lock.json ./
RUN npm ci --no-audit --maxsockets=1
COPY packages/mail/ ./
RUN npm run build

WORKDIR /app
