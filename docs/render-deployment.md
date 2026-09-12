# Render Deployment Guide

## Current deployment setup

The live environment was set up manually through the Render dashboard — **not** via the `render.yaml` Blueprint. The three services were created individually:

- `edu-platform-frontend` — Static Site
- `edu-platform-api` — Web Service (Node)
- `edu-platform-db` — PostgreSQL database

The `render.yaml` file in the repo root reflects the intended Blueprint configuration and can be used as a reference, but the live services were provisioned by hand.

---

## Service configuration reference

### Backend web service (`edu-platform-api`)

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `npm ci && npm run prisma:generate && npm run build` |
| Start command | `npm run prisma:migrate:deploy && npm run prisma:seed:if-empty && npm run start` |
| Health check path | `/health` |
| `DATABASE_URL` | from the linked `edu-platform-db` Postgres instance |
| `JUDGE0_API_KEY` | set manually in Render dashboard — never commit to repo |
| `JUDGE0_API_URL` | `https://judge0-ce.p.rapidapi.com` |

### Frontend static site (`edu-platform-frontend`)

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Build command | `npm ci && npm run build` |
| Publish directory | `dist` |
| `VITE_API_BASE_URL` | `https://<your-api-service>.onrender.com` |
| SPA rewrite | `/* → /index.html` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Embedder-Policy` | `credentialless` |

---

## Verifying the deployment

After a deploy:

```bash
# Backend health
curl https://<api-url>.onrender.com/health
# Expected: { "status": "ok" }

# Authenticated check
curl -H 'x-user-id: t-1' https://<api-url>.onrender.com/me
curl -H 'x-user-id: s-1' https://<api-url>.onrender.com/courses
```

Open the frontend URL in a browser to verify the UI loads and connects to the API.

---

## Notes

- The API build installs dependencies, generates the Prisma client, and compiles TypeScript.
- The start command runs outstanding Prisma migrations and seeds demo data only when the database is empty.
- `JUDGE0_API_KEY` is marked `sync: false` in `render.yaml` and must never be committed to the repository. Set it directly in the Render dashboard under the API service's Environment settings.
- If you see `Route GET:/ not found` when hitting the API root directly, this is expected — the Fastify API does not serve the frontend. Open the frontend static site URL instead.

---

## Backend deploy troubleshooting

### Prisma migration failures on Render

Render runs the backend start command below on every deploy:

```bash
npm run prisma:migrate:deploy && npm run prisma:seed:if-empty && npm run start
```

Because of that, every committed Prisma migration must be a single incremental step. Do **not** add a second `init` migration or any migration that re-creates tables or enums that already exist in production.

If the backend deploy fails during `prisma migrate deploy` with errors about existing tables, enums, or constraints:

1. Compare the newest migration directory with the earlier migrations in `backend/prisma/migrations`.
2. Remove any duplicate baseline/init migration from the repository and keep only the incremental migration that introduces the new schema change.
3. Commit the migration fix and trigger a new Render deploy.
4. Leave the Render service configuration unchanged unless the build/start commands themselves were intentionally updated in the repo.

For this project, the Render platform settings do **not** need a special change for the autograder release; the deploy issue was caused by a duplicate Prisma migration being committed, not by a Render dashboard misconfiguration.
