# Docker Usage

This guide runs LETF Lab with Docker Compose, PostgreSQL 18, and the OpenCode CLI inside the backend container.

## Start The App

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up --build
```

Defaults:

- App: `http://localhost:8080`
- API health: `http://localhost:8080/api/health`
- PostgreSQL on host: `localhost:15432`
- PostgreSQL inside Docker: `db:5432`

If a port conflicts with your host, edit `.env.docker`:

```env
APP_HOST_PORT=8081
POSTGRES_HOST_PORT=15432
PUBLIC_ORIGIN=http://localhost:8081
```

`PUBLIC_ORIGIN` must match the URL used in the browser.

## OpenCode Inside Docker

The backend image installs `opencode` and `.env.docker.example` enables it with:

```env
AI_CLI_COMMAND=opencode
AI_CLI_MODEL=openai/gpt-5.4-mini-fast
```

OpenCode credentials and config are persisted in Docker volumes:

- `opencode_data`: `/root/.local/share/opencode`
- `opencode_config`: `/root/.config/opencode`

This keeps authentication across container restarts and rebuilds.

## Connect OpenCode

Start the stack, then enter the backend container:

```bash
docker compose --env-file .env.docker exec backend sh
```

Check the CLI:

```bash
opencode --version
opencode auth list
```

Authenticate interactively:

```bash
opencode
```

Inside the OpenCode TUI, run:

```text
/connect
```

Follow the browser/auth instructions shown by OpenCode. If the flow gives you a URL or code, open it from your host browser and paste the result back into the container terminal.

Alternative CLI login:

```bash
opencode auth login
```

After login, verify:

```bash
opencode auth list
```

## Test Headless Usage

From inside the backend container:

```bash
opencode run --format json "Responda apenas: ok"
```

From the host:

```bash
docker compose --env-file .env.docker exec backend opencode run --format json "Responda apenas: ok"
```

If this succeeds, LETF Lab's AI features can call the same CLI through `AI_CLI_COMMAND=opencode`.

## Useful Commands

Show services:

```bash
docker compose --env-file .env.docker ps
```

Show backend logs:

```bash
docker compose --env-file .env.docker logs -f backend
```

Restart backend after changing `.env.docker`:

```bash
docker compose --env-file .env.docker up -d --force-recreate backend
```

Stop containers without deleting data:

```bash
docker compose --env-file .env.docker down
```

Delete containers and volumes, including database and OpenCode auth:

```bash
docker compose --env-file .env.docker down -v
```

## Production Notes

For a public domain with HTTPS:

```env
PUBLIC_ORIGIN=https://your-domain.com
AUTH_COOKIE_SECURE=true
```

Put your TLS reverse proxy in front of the exposed app port. Do not keep default passwords or `AUTH_JWT_SECRET` values in production.
