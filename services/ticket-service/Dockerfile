FROM tartan-base:local

WORKDIR /app/services/ticket-service
COPY services/ticket-service/package.json services/ticket-service/package-lock.json ./
RUN npm ci --no-audit --maxsockets=1

COPY services/ticket-service/ .

RUN chown -R node:node /app
USER node

CMD ["npm", "start"]
