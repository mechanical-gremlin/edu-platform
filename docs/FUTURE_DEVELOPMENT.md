# Production TODO

Things remaining before the site is considered fully production-ready.

---

## Deployment & Infrastructure

- [ ] **Connect `VITE_API_BASE_URL`** — confirm the frontend env var is pointing at the live API service URL on Render so the UI is not falling back to localhost.
- [ ] **Align `render.yaml` with live setup** — the Blueprint file currently describes the intended configuration; update it to match however the live services are actually configured so it can be used for future re-deploys or environment clones.
- [ ] **Custom domain** — attach a real domain to both the frontend static site and the API service in the Render dashboard and provision TLS certificates.
- [ ] **Environment separation** — create a staging service (or use Render preview environments) so changes can be tested before hitting production.
- [ ] **Render service plan** — evaluate whether the free-tier spin-down behavior is acceptable; upgrade the API service to a paid plan if cold-start latency is a problem for real users.

---

## Authentication & User Management

- [ ] **Replace `x-user-id` header auth** — the current scheme is an MVP shortcut. Implement real authentication (JWT, session cookie, or an OAuth provider such as Google) before the platform is open to real students and teachers.
- [ ] **User registration and login UI** — build sign-up, log-in, password-reset, and (optionally) email-verification flows.
- [ ] **Role management** — teachers and students are currently seeded; add an admin interface or invitation flow for managing real users.

---

## Data & Database

- [ ] **Remove seed data from production** — the auto-seed on first boot is useful for demos but should be gated behind an env flag or removed entirely for a real deployment.
- [ ] **Database backups** — enable automated Postgres backups on Render (or use a managed provider with point-in-time recovery).
- [ ] **Database on a paid plan** — the free Render Postgres tier is deleted after 90 days; upgrade before launch.

---

## Code Execution (Monaco + Judge0)

- [ ] **Set `JUDGE0_API_KEY`** — the RapidAPI key must be added in the Render dashboard under the API service environment variables before code execution works in production.
- [ ] **Capacity planning** — the free Judge0 tier allows ~50 submissions/day. Upgrade to a paid Sulu tier or self-host Judge0 CE before opening to a class.
- [ ] **Rate limiting** — add per-user or per-class rate limits on the `/execute` endpoint to prevent abuse.

---

## Features Still Needed

- [ ] **Persistent student code saving** — students currently submit code manually via the text box. Auto-save the Monaco editor contents to the backend so no work is lost if the page is closed mid-session.
- [ ] **Godot in-browser embedding** — the Godot activity type currently links out to a new window. Investigate self-hosting a Godot web build on a subdomain to allow embedded editing and project submission.
- [ ] **Teacher file upload for Godot starter projects** — allow teachers to upload a `.zip` starter project when creating a Godot activity; distribute it automatically when students open the activity.
- [ ] **File/object storage** — required for Godot project zips and any future binary assets. Evaluate Render Disk or AWS S3.

---

## Quality & Operations

- [ ] **Error monitoring** — integrate Sentry (or similar) on both frontend and backend.
- [ ] **Logging** — add structured logging to the Fastify backend with log levels and request IDs; ship logs to a log aggregation service.
- [ ] **CI pipeline** — add a GitHub Actions workflow that runs lint, type-check, and tests on every pull request.
- [ ] **End-to-end tests** — add at least smoke tests covering login, course navigation, activity submission, and grading.
- [ ] **Accessibility audit** — run an a11y audit (axe, Lighthouse) and address critical issues before student-facing launch.

