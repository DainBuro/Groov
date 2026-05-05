# Deploying Groov to Hostinger Dokploy

This guide walks through deploying Groov (Postgres + Express backend + React frontend) to a Hostinger VPS running Dokploy.

## Prerequisites

- A Hostinger VPS with Dokploy installed (see `https://docs.dokploy.com/`).
- A domain (or subdomain) pointed at the VPS public IP via an `A` record.
- Push access to this Git repository.

## 1. Repository layout Dokploy expects

Dokploy can deploy this project from the included `docker-compose.yml`. Three services are defined:

| Service    | Container port | Purpose                              |
|------------|----------------|--------------------------------------|
| `db`       | 5432           | PostgreSQL 17                        |
| `backend`  | 3003           | Express API + Swagger at `/api-docs` |
| `frontend` | 80             | React build served by nginx, also reverse-proxies `/api/*` to the backend |

The frontend container's `nginx.conf` proxies `/api/*` to `http://backend:3003/`, so a single domain pointed at the `frontend` service is enough.

## 2. Create the application in Dokploy

1. In Dokploy, create a new **Compose** application.
2. Connect your Git provider and select this repository / branch.
3. Set the **Compose file path** to `docker-compose.yml`.
4. Save.

## 3. Set environment variables

In the Dokploy app's **Environment** tab, paste the following (replace placeholders):

```env
# Database
POSTGRES_USER=groov
POSTGRES_PASSWORD=<generate a strong password>
POSTGRES_DB=groov_db
DB_HOST_PORT=5435

# Backend
NODE_ENV=production
BACKEND_PORT=3003
ACCESS_TOKEN_SECRET=<openssl rand -base64 32>
REFRESH_TOKEN_SECRET=<openssl rand -base64 32>
CORS_ORIGIN=https://your-domain.com

# Frontend
FRONTEND_PORT=3000
REACT_APP_API_URL=/api
```

> **Important:** `REACT_APP_API_URL` is a **build-time** variable. After changing it you must rebuild the frontend (Dokploy → Deployments → Rebuild).

## 4. Configure domains

In the Dokploy app's **Domains** tab:

1. Add a domain pointing to the **`frontend`** service, container port `80`.
2. Enable HTTPS / Let's Encrypt — Dokploy/Traefik handles the certificate automatically.

You do **not** need to expose `backend` or `db` publicly. The frontend's nginx proxies API traffic internally over the Docker network.

If you instead want the API on its own subdomain (e.g. `api.your-domain.com`):
- Point a second domain in Dokploy at the `backend` service (port `3003`).
- Set `REACT_APP_API_URL=https://api.your-domain.com` and rebuild the frontend.
- Keep `CORS_ORIGIN=https://your-domain.com` so the API trusts the frontend origin.

## 5. Deploy

Click **Deploy**. Dokploy will:

1. Pull the repo.
2. Build the `backend` and `frontend` images.
3. Start `db` (with a healthcheck), then `backend` (which runs migrations on boot via `docker-entrypoint.sh`), then `frontend`.

Watch the logs in the Dokploy UI. The first build takes a few minutes.

## 6. Database

- The Postgres data lives in the `db-data` named volume managed by Docker. Back it up with Dokploy's volume backup feature or `pg_dump`.
- Migrations run automatically on every backend start via `docker-entrypoint.sh` → `npm run migrate:prod`.
- Seeding is **disabled** in production. To seed once, set `RUN_SEED=true` on the backend service for one deploy, then remove it.

## 7. Optional: pose extraction (YOLOv8)

The backend exposes a pose-extraction job that shells out to `python tools/extract_pose.py`. The default `node:18-alpine` image **does not include Python**, so this feature will fail until you either:

- Extend `backend/Dockerfile` to install Python + `tools/requirements.txt` + the YOLO model weights, or
- Run that worker as a separate service.

The rest of the application (auth, dance moves, sequences, ratings, events) works without it.

## 8. Local development

```bash
cp .env.example .env       # fill in secrets
docker compose up --build
```

- Frontend: <http://localhost:3000>
- Backend:  <http://localhost:3003>
- Swagger:  <http://localhost:3003/api-docs>
- Postgres: `localhost:5435` (user/db from `.env`)

## 9. Post-deploy checklist

- [ ] HTTPS resolves on the domain.
- [ ] `https://your-domain.com/api/api-docs` (or your API domain) loads Swagger.
- [ ] Sign up + login works (cookies should be set with `Secure` over HTTPS).
- [ ] `CORS_ORIGIN` matches the exact public origin (no trailing slash).
- [ ] JWT secrets are unique to production and were **not** reused from any committed `.env` files.
