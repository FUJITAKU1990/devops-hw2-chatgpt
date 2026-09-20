FROM tartan-base:local

WORKDIR /app/services/auth-service
COPY services/auth-service/package.json services/auth-service/package-lock.json ./
RUN npm ci --no-audit --maxsockets=1

COPY services/auth-service/ .

RUN chown -R node:node /app
USER node

CMD ["npm", "start"]
