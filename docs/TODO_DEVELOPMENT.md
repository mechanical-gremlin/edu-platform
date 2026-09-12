# Development TODO (Prioritized)

This list is ordered by implementation priority for LMS viability.

---

## P0 — Must be functional for coding LMS viability

- [ ] **Production execution key configured** — set `JUDGE0_API_KEY` on the Render backend service so `/execute` can run student code in production.
- [ ] **Execution reliability + limits** — add per-user/per-course rate limits and request timeouts around `/execute`.
- [ ] **Autosave coding work** — persist in-progress editor state (not only final submission) so students do not lose work.
- [ ] **Teacher review for coding submissions** — ensure gradebook surfaces the latest submitted code/files for fast teacher grading workflows.
- [ ] **Multi-file coding for non-web languages** — support multiple files (for example Python + text/config files) and execute them as a project.
- [ ] **File tree UX** — add file/folder creation and drag-drop organization in the coding workspace.

---

## P1 — Production-readiness and security

- [ ] **Replace `x-user-id` auth** — implement real authentication/authorization for teacher and student accounts.
- [ ] **Environment parity** — keep `render.yaml` and live Render service settings fully aligned.
- [ ] **Backups and data durability** — enable managed backups and move off ephemeral/free DB tiers before real usage.
- [ ] **Error monitoring + structured logs** — add centralized error tracking and request-correlated backend logs.

---

## P2 — Platform completeness

- [ ] **Godot project pipeline** — support teacher upload and student submission of Godot starter projects.
- [ ] **Object storage integration** — add storage for project archives and other binary assets.
- [ ] **E2E regression coverage** — automate smoke flows (login, coding run, submit, gradebook).
- [ ] **Accessibility hardening** — complete a11y audit and fix critical findings.
