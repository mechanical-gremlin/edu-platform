# Development TODO (Prioritized)

This list is ordered by implementation priority for LMS viability.

---

## P0 — Must be functional for coding LMS viability

- [ ] **Production execution key configured** — set `JUDGE0_API_KEY` on the Render backend service so `/execute` can run student code in production.
- [ ] **Execution reliability + limits** — add per-user/per-course rate limits and request timeouts around `/execute`.
- [x] **Autosave coding work** — student coding drafts now persist in browser localStorage so navigating away from an assignment no longer clears the in-progress editor.
- [x] **Teacher review for coding submissions** — gradebook grading panel now loads coding submissions directly into the runnable editor for teacher debugging and feedback.
- [x] **Teacher-selected starter language + optional lock** — teacher-selected language now reaches student view and optional lock prevents student language switching.
- [ ] **Multi-file coding projects** — support multiple files (for example Python + text/config files) and run them as a single project workspace.
- [x] **VS Code-style file manager UX** — the Web Development Kit now ships with a side file tree plus a show/hide toggle, and the explorer starts collapsed to protect the editor/preview layout.
- [x] **Checkpoint history + reset for coding drafts** — students can save a few local checkpoints, restore one, or reset back to the starter template.
- [x] **Restore submitted code into the editor** — reopening a coding assignment now reloads the last submitted code/files instead of resetting to the starter template.
- [x] **HTML preview support** — HTML coding activities now render a preview pane so the standalone HTML option has an in-app visual result.

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
- [ ] **Backend-synced coding drafts** — move draft/checkpoint persistence from browser-local storage into the backend so students can resume work on any device.
- [ ] **Run/step/stop debugging controls** — extend run-only execution with explicit stop/step UX plus backend-enforced runaway-program protections.
- [ ] **Teacher suggested-solution runner** — let teachers execute a reference solution and promote its output into the expected-output grader.
- [ ] **Framework/runtime expansion for the Web Development Kit** — evaluate optional presets for libraries/frameworks (for example Bootstrap/Tailwind or Flask-backed web projects) without overwhelming beginner workflows.
