FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm

# RUN npx playwright install-deps

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*
