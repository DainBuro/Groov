# Deploying Groov with Dokploy on Hostinger

Dokploy handles the reverse proxy (Traefik), TLS (Let's Encrypt), and rebuilds
on git push. This repo is pre-configured for it via `docker-compose.dokploy.yml`.

## What's in this setup

- **Public service:** `frontend` (nginx). It already proxies `/api/*` to the
  backend container, so only this service is exposed to the internet.
- **Private services:** `backend` and `db` are reachable only on the internal
  Docker network — no host ports published.
- **Network:** `frontend` is attached to Dokploy's external `dokploy-network`
  so Traefik can route to it.

## 1. Provision the VPS and install Dokploy

1. In Hostinger, get a VPS plan (KVM 2 / 4 GB RAM is plenty) with **Ubuntu 24.04**.
2. SSH in as root and run the official installer:

   ```bash
   curl -sSL https://dokploy.com/install.sh | sh
   ```

3. Open `http://<vps-ip>:3000`, create the admin account.

## 2. Point your domain at the VPS

At your DNS provider, add an `A` record (and `AAAA` if IPv6):

| Type | Name    | Value             |
| ---- | ------- | ----------------- |
| A    | `groov` | `<vps-ipv4>`      |
| AAAA | `groov` | `<vps-ipv6>`      |

Wait until `dig groov.example.com +short` returns the VPS IP before issuing
TLS — Traefik needs it to validate.

## 3. Create the Compose application in Dokploy

1. **Project** → **Create Application** → **Compose**.
2. **Provider:** Git. Paste the repo URL and pick the branch (`main` or
   `develop-branch`).
3. **Compose Path:** `docker-compose.dokploy.yml`
4. **Environment** tab: paste the contents of `.env.dokploy.example` and fill
   in real values. Generate secrets with:

   ```bash
   openssl rand -base64 32   # ACCESS_TOKEN_SECRET / REFRESH_TOKEN_SECRET
   openssl rand -base64 24   # POSTGRES_PASSWORD
   ```

   For the **first** deploy set `RUN_SEED=true`; flip it back to `false`
   after the first successful boot.

5. **Domains** tab → **Add Domain**:
   - Service: **frontend**
   - Container Port: **80**
   - Host: `groov.example.com`
   - HTTPS: on, Certificate Provider: Let's Encrypt
6. Click **Deploy**. Watch the build/run logs in the Dokploy UI.

Once the backend reports "Starting the backend...", visit
`https://groov.example.com`.

## 4. Updating the app

Push to the deploy branch, then click **Redeploy** in Dokploy (or enable
auto-deploy via webhook in the application settings — Dokploy gives you a
GitHub/GitLab webhook URL to paste into your repo).

The backend's `docker-entrypoint.sh` runs migrations automatically on each
boot, so schema changes ship with the deploy.

## 5. Backups

Dokploy has built-in scheduled backups for Postgres services, but those apply
to **standalone DB services** created through Dokploy — not databases that
live inside a Compose stack like this one. Easiest options:

- **Manual / scripted:** SSH to the VPS and run
  ```bash
  docker exec -i $(docker ps -qf name=groov.*db) \
    pg_dump -U <POSTGRES_USER> -d <POSTGRES_DB> | gzip > groov_$(date +%F).sql.gz
  ```
  Cron this if you want it nightly.
- **Or** move Postgres out of the Compose file and create it as a dedicated
  Dokploy Postgres service — then you get the UI-managed backups, and the
  `backend` service just points `DB_HOST` at it.

For a student project, manual dumps before each schema change is usually fine.

## Troubleshooting

- **502 from Traefik right after deploy** — frontend container is still
  starting, or Traefik hasn't picked up the route yet. Wait 30s; if it
  persists, check the frontend logs.
- **Cert issuance fails** — DNS hasn't propagated, or port 80 is blocked.
  Dokploy's Traefik logs (under the global settings) show the ACME error.
- **CORS errors** — `CORS_ORIGIN` must exactly match the public URL
  (`https://groov.example.com`, scheme included, no trailing slash).
- **Seed didn't run** — `RUN_SEED=true` only seeds *after* migrations
  succeed. Check `backend` logs; re-trigger by redeploying with the flag set.
- **Migrations fail on boot** — the backend container exits and Dokploy will
  keep restarting it. Read `backend` logs to see the SQL error, fix the
  migration, push, redeploy.
