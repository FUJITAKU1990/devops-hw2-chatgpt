# Tartan Tickets

Tartan Tickets is an event ticketing platform for discovering events, selecting available tickets or seats, completing purchases, and managing orders.
It uses a React frontend, Node/Express microservices, and a Postgres database.

## Local Setup

Tartan Tickets runs as a Docker Compose application.
For local development, the single Compose file builds and starts the complete stack.

The Compose file is `docker-compose.yml`.

## Getting Started

1. Create a local env file if you do not already have one:

   ```bash
   cp -n .env.example .env
   ```

2. Start the local development stack:

   ```bash
   docker compose up --build
   ```

   The first start may take a few minutes because Docker needs to build images and the migrator seeds the database.

3. Open the app in your browser:

   - Frontend: `http://localhost:8636`
   - Mailpit: `http://localhost:8636/mailpit/`

4. Stop the stack when you are done:

   ```bash
   docker compose down
   ```

5. If you want a clean reset of the local database and volumes, stop the stack and remove volumes:

   ```bash
   docker compose down -v
   ```

## Local URLs

Once the local stack is running, these are the main entry points:

| Component | URL | Notes |
|---|---|---|
| Frontend / ingress | http://localhost:8636 | The only host-published port; it proxies application dependencies internally |
| Mailpit | http://localhost:8636/mailpit/ | Activation and other outgoing email, through the frontend ingress |
| TartanPay Dashboard | http://localhost:8636/tartanpay/ | Fake payment provider admin view, through the frontend ingress |

These URLs are for a browser on your host machine.
The Dev Container is a separate container, so `localhost` there refers to the Dev Container itself, not to the running application.
From a terminal inside the Dev Container, reach the application at **http://host.docker.internal:8636** instead.
`TARTAN_BASE_URL` is already set to that value for you, so `./scripts/check` and the system tests work without any extra setup.

## Activation Emails

New users must activate their account before they can sign in. After registering, they receive an email with a link to activate; until they click it (or an admin activates the account), they cannot log in.

**Viewing activation emails:**

- **Local development:** Open **http://localhost:8636/mailpit/** to open Mailpit. All outgoing mail (including activation emails) appears there; click a message to see it and use the activation link.
- **Production:** Open **/mailpit** on your deployed site and sign in with the Mailpit password provided to you. Do not share this password.

Because viewing activation emails requires access to Mailpit, only you and the TAs can fully interact with your site (register, activate, and sign in). If you want other people to use your site, you need to open Mailpit, find their activation email, and click the activation link for them. You should not share your Mailpit credentials.

## Verification

With the Compose application already running, run the cumulative local checks from the repository root:

```bash
./scripts/check
```

The command uses `TARTAN_BASE_URL`, which the Dev Container sets to `http://host.docker.internal:8636`.
It falls back to `http://localhost:8636` when the variable is unset, which is the right value when you run the checks from your host rather than the Dev Container.
Starter system tests and guidance for extending them live in [`tests/`](tests/).

## Where To Look Next

- Example seat-map data: [`data/seat-maps/`](data/seat-maps/)
- Environment defaults: [`.env.example`](.env.example)
- System tests: [`tests/`](tests/)
- Shared workspace/package scripts: [`package.json`](package.json)
- Shared runtime topology: [`docker-compose.yml`](docker-compose.yml)
