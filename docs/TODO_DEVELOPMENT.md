# Development TODO (Prioritized)

This list is ordered by implementation priority for LMS viability.

---

## P0 — Must be functional for coding LMS viability

- [ ] **Production execution key configured** — set `JUDGE0_API_KEY` on the Render backend service so `/execute` can run student code in production.
- [ ] **Execution reliability + limits** — add per-user/per-course rate limits and request timeouts around `/execute`.
- [ ] **Autosave coding work** — persist in-progress editor state (not only final submission) so students do not lose work.
- [x] **Teacher review for coding submissions** — gradebook grading panel now loads coding submissions directly into the runnable editor for teacher debugging and feedback.
- [x] **Teacher-selected starter language + optional lock** — teacher-selected language now reaches student view and optional lock prevents student language switching.
- [ ] **Multi-file coding projects** — support multiple files (for example Python + text/config files) and run them as a single project workspace.
- [ ] **VS Code-style file manager UX** — add a side file tree with file/folder creation plus a show/hide toggle for the file manager.

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
