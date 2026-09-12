# Computer Science LMS

Educational platform prototype with a React frontend for teacher/student workflows and a Fastify + Prisma backend backed by PostgreSQL.

## What is in this repo

- `/home/runner/work/edu-platform/edu-platform/frontend` — Vite + React + TypeScript + Tailwind UI prototype
- `/home/runner/work/edu-platform/edu-platform/backend` — Fastify API with Prisma models, migrations, and seed data
- `/home/runner/work/edu-platform/edu-platform/docs` — wireframes and component notes
- `/home/runner/work/edu-platform/edu-platform/render.yaml` — Render blueprint for deploying the stack

## Current implementation

- The frontend currently runs from local mock data for the teacher/student demo flows.
- The backend exposes seeded REST endpoints for users, courses, progress, and grades.
- Coding activities execute through backend `POST /execute` using Judge0 (RapidAPI free tier or self-hosted Judge0 URL).
- The Monaco-based coding editor has been smoke-tested end-to-end with JavaScript and Python sample programs.
- Student coding drafts now auto-save in browser storage, support manual checkpoints/restore, and can reset back to the teacher starter template.
- HTML activities render an in-app browser preview, and the web multi-file workspace is labeled **Web Development Kit** with the file explorer collapsed by default.
- Render deployment provisions:
  - a static frontend
  - a Node API service
  - a PostgreSQL database
- The API seeds demo data automatically on first boot so the deployed environment is immediately testable.

## Coding editor roadmap

- Next: move coding draft persistence from browser-local storage to backend-backed draft sync so work follows students across devices.
- Next: add multi-file execution packaging for non-web languages (for example Python + config/data files).
- Next: expand coding controls beyond run-only flows with explicit stop/step/debug affordances and stronger runaway-execution safeguards.
- Next: add a teacher-facing suggested-solution runner so expected output can be generated from executable reference code.

## Local development

### Frontend

```bash
cd /home/runner/work/edu-platform/edu-platform/frontend
cp .env.example .env
npm install
npm run dev
```

### Backend

```bash
cd /home/runner/work/edu-platform/edu-platform
cp backend/.env.example backend/.env
npm --prefix backend install
docker compose up -d postgres
npm --prefix backend run prisma:migrate -- --name init
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:seed
npm --prefix backend run dev
```

API default URL: `http://localhost:3001`

> To enable code execution locally, either:
> - use RapidAPI Judge0 (`JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com`) + `JUDGE0_API_KEY`, or
> - point `JUDGE0_API_URL` to a self-hosted Judge0 instance (no RapidAPI key required).

Demo auth header:

- Teacher: `x-user-id: t-1`
- Students: `x-user-id: s-1`, `s-2`, `s-3`, `s-4`

Useful checks:

```bash
curl http://localhost:3001/health
curl -H 'x-user-id: t-1' http://localhost:3001/me
curl -H 'x-user-id: s-1' http://localhost:3001/courses
```

## Deploying to Render

1. Push this repository to GitHub.
2. In Render, create a new Blueprint instance from the repository.
3. Render will read `/home/runner/work/edu-platform/edu-platform/render.yaml` and create:
   - `edu-platform-api`
   - `edu-platform-frontend`
   - `edu-platform-db`
4. Approve the infrastructure and start the deploy.
5. After the first deploy finishes:
   - open the frontend URL to test the UI
   - call the API `/health` endpoint to confirm the backend is live
   - use the demo `x-user-id` values above to test authenticated API routes
   - set frontend env var `VITE_API_BASE_URL` to your deployed API URL so frontend can call backend endpoints
   - if using RapidAPI Judge0, set backend env var `JUDGE0_API_KEY` so coding activities can run code (self-hosted Judge0 does not require it)
6. If you see `Route GET:/ not found` on Render, see `/home/runner/work/edu-platform/edu-platform/docs/render-deployment.md` for service URL expectations and full deployment checks.

### Render behavior

- The API build installs dependencies, generates Prisma client code, and compiles TypeScript.
- The API start command applies Prisma migrations and seeds demo data only when the database is empty.
- The frontend is published as a static single-page app with a rewrite to `index.html`.

## Project structure highlights

- Teacher and student dashboards
- Expandable course hierarchy (units → lessons → activities)
- Activity detail views and teacher creation flow
- Teacher gradebook workflow
- Seeded backend data that mirrors the demo frontend content

See `/home/runner/work/edu-platform/edu-platform/docs` for the wireframes and component map.
