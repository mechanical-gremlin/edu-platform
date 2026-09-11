# Render Deployment Guide

## Why you are seeing `Route GET:/ not found`

The backend is a Fastify API service. If you open the API service URL directly at `/`, Fastify returns a route-not-found error unless a root route exists.

Also, this repository is designed to run as **two Render services**:

- `edu-platform-frontend` (static site) for the demo UI
- `edu-platform-api` (Node web service) for API endpoints like `/health`, `/me`, `/courses`

If you deploy only one web service from `backend`, visiting `/` will not show the frontend app.

## Correct deployment steps (Blueprint)

1. In Render, choose **New +** → **Blueprint**.
2. Connect `mechanical-gremlin/edu-platform`.
3. Deploy using `/home/runner/work/edu-platform/edu-platform/render.yaml`.
4. Confirm Render creates:
   - `edu-platform-frontend` (Static Site)
   - `edu-platform-api` (Web Service)
   - `edu-platform-db` (PostgreSQL)
5. After deploy:
   - Open the **frontend URL** for the demo product experience.
   - Use the API URL for API checks (`/health`, `/me`, etc.).

## Expected URLs and checks

- Frontend: open service root `/`
- API health: `GET /health` should return:
  ```json
  { "status": "ok" }
  ```
- API root: `GET /` now returns service metadata.

## Important Render settings

- API service root directory: `backend`
- API build command: `npm ci && npm run prisma:generate && npm run build`
- API start command: `npm run prisma:migrate:deploy && npm run prisma:seed:if-empty && npm run start`
- API health check path: `/health`
- Frontend static publish path: `dist`
- Frontend rewrite: `/* -> /index.html`
- Frontend environment variable: `VITE_API_BASE_URL=https://<your-api-service>.onrender.com`

## Manual setup (no Blueprint)

If you are deploying for free and not using Blueprint:

### Backend web service
- Root directory: `backend`
- Build command: `npm ci && npm run prisma:generate && npm run build`
- Start command: `npm run prisma:migrate:deploy && npm run prisma:seed:if-empty && npm run start`
- Health check path: `/health`
- Environment variable: `DATABASE_URL` from your Render Postgres instance

### Frontend static site
- Root directory: leave blank
- Build command: `npm --prefix frontend ci && npm --prefix frontend run build`
- Publish directory: `frontend/dist`
- Environment variable: `VITE_API_BASE_URL=https://<your-api-service>.onrender.com`
- Add SPA rewrite rule in Static Site settings: `/* -> /index.html`
