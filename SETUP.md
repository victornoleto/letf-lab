# LETF Lab Setup

This guide installs LETF Lab locally or on a VPS.

## Requirements

- Ubuntu/Debian VPS or local Linux host.
- Python 3.11+; Python 3.12 recommended.
- Node.js 20+ and npm.
- PostgreSQL 14+ for production.
- Git.
- Optional: `uv` for faster Python installs.
- Optional: nginx + Certbot for HTTPS.

## 1. Clone

```bash
git clone git@github.com:victornoleto/letf-lab.git
cd letf-lab
```

If deploying from the current working tree before pushing, copy/sync this directory to the VPS instead.

## 2. Install System Packages

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nodejs npm postgresql postgresql-contrib nginx
```

If your distro ships an old Node.js, install Node 20+ from NodeSource or your preferred package source before running `npm install`.

## 3. Backend Environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://letf_lab:CHANGE_ME@localhost:5432/letf_lab
PRICE_CACHE_DIR=../data/prices
REFRESH_HOUR_ET=22
LOG_LEVEL=INFO
ALLOW_ORIGINS=https://your-domain.com,http://localhost:4200

AUTH_JWT_SECRET=generate-a-long-random-secret
AUTH_TOKEN_TTL_HOURS=24
AUTH_COOKIE_SECURE=true

# Optional AI integration
AI_CLI_COMMAND=opencode
AI_CLI_MODEL=openai/gpt-5.4-mini-fast
AI_CLI_TIMEOUT_S=60
AI_CLI_PROMPTS_DIR=prompts
ANTHROPIC_API_KEY=
```

Generate a secret:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

For local HTTP development, keep `AUTH_COOKIE_SECURE=false`.

## 4. Install Dependencies

```bash
make install
```

Equivalent manual commands:

```bash
python3 -m venv backend/.venv
cd backend
.venv/bin/pip install -e ".[dev]"
cd ../frontend
npm install
```

## 5. PostgreSQL

For local defaults from `.env.example`:

```bash
make db-create
```

For production names/passwords:

```bash
sudo -u postgres psql
```

```sql
CREATE ROLE letf_lab LOGIN PASSWORD 'CHANGE_ME';
CREATE DATABASE letf_lab OWNER letf_lab;
\q
```

Ensure `DATABASE_URL` matches the role, password, host, port, and database.

## 6. Migrate and Seed

```bash
make migrate
SEED_USER_EMAIL=admin@example.com SEED_USER_PASSWORD='CHANGE_ME' make seed
```

The seed script is idempotent. It creates:

- default indicators;
- example LETF strategies;
- admin user if missing.

## 7. Run Locally

```bash
make dev
```

Open:

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:8000/api/health`

## 8. Manual Refresh

After login, use the UI refresh action or call the API with an authenticated session.

From backend code, the scheduled job uses:

- price refresh;
- signal snapshots;
- transitions;
- validation gates;
- AI reports if configured.

The scheduler starts automatically with the FastAPI process.

## 9. Production Build

```bash
cd frontend
npm run build
```

Frontend output is under `frontend/dist/`.

## 10. Run Backend with systemd

Create `/etc/systemd/system/letf-lab-api.service`:

```ini
[Unit]
Description=LETF Lab API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/letf-lab/backend
EnvironmentFile=/var/www/letf-lab/backend/.env
ExecStart=/var/www/letf-lab/backend/.venv/bin/uvicorn ai_swing.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Adjust paths and user if your deployment directory/user differ.

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now letf-lab-api
sudo systemctl status letf-lab-api
```

## 11. Scheduler / Cron

The app already runs APScheduler inside the backend process:

- daily refresh at `REFRESH_HOUR_ET` in America/New_York;
- weekly digest every Monday at 09:00 ET.

If you prefer an external cron trigger, keep the API service running and call a small script or authenticated endpoint. The built-in scheduler is the recommended path for now because it uses the same application config and service code.

Check logs:

```bash
journalctl -u letf-lab-api -f
```

## 12. Nginx Reverse Proxy

Example `/etc/nginx/sites-available/letf-lab`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/letf-lab/frontend/dist/frontend/browser;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/letf-lab /etc/nginx/sites-enabled/letf-lab
sudo nginx -t
sudo systemctl reload nginx
```

Add HTTPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

After HTTPS is working, set in `backend/.env`:

```env
AUTH_COOKIE_SECURE=true
ALLOW_ORIGINS=https://your-domain.com
```

Restart:

```bash
sudo systemctl restart letf-lab-api
```

## 13. Deployment Checklist

- `backend/.env` exists and has production secrets.
- PostgreSQL role/database exist.
- `make migrate` completed.
- Admin user seeded with a strong password.
- `PRICE_CACHE_DIR` directory exists and is writable by the service user.
- API service is running.
- Frontend is built and served by nginx.
- HTTPS is enabled.
- `ALLOW_ORIGINS` matches the public frontend URL.
- `AUTH_COOKIE_SECURE=true` behind HTTPS.
- Logs show scheduler startup and next run times.

## 14. Useful Commands

```bash
# Backend logs
journalctl -u letf-lab-api -f

# Run migrations
cd /var/www/letf-lab && make migrate

# Re-seed admin/standard data
cd /var/www/letf-lab && SEED_USER_EMAIL=admin@example.com SEED_USER_PASSWORD='CHANGE_ME' make seed

# Run backend tests
cd /var/www/letf-lab/backend && .venv/bin/pytest -q

# Build frontend
cd /var/www/letf-lab/frontend && npm run build
```
