# Development TODO (Reordered Priorities)

This list is reordered to match the current development sequence request.

---

## P0 — Fully functional coding editor (all languages + project types)

- [ ] **Production execution key configured** — set `JUDGE0_API_KEY` on the Render backend service so `/execute` can run student code in production.
- [ ] **Execution reliability + limits** — add per-user/per-course rate limits and request timeouts around `/execute`.
- [ ] **Multi-file coding projects** — support multiple files (for example Python + text/config files) and run them as a single project workspace.
- [ ] **Framework/runtime expansion for the Web Development Kit** — evaluate optional presets for libraries/frameworks (for example Bootstrap/Tailwind or Flask-backed web projects) without overwhelming beginner workflows.
- [ ] **Run/step/stop debugging controls** — extend run-only execution with explicit stop/step UX plus backend-enforced runaway-program protections.
- [ ] **Language/runtime coverage matrix** — define and validate which languages/runtimes are officially supported in MVP and production.
- [ ] **Project template catalog** — provide starter templates by project type (single file, multi-file, web, game, and config-driven projects).
- [x] **Autosave coding work** — student coding drafts now persist in browser localStorage so navigating away from an assignment no longer clears the in-progress editor.
- [x] **Checkpoint history + reset for coding drafts** — students can save a few local checkpoints, restore one, or reset back to the starter template.
- [x] **Restore submitted code into the editor** — reopening a coding assignment now reloads the last submitted code/files instead of resetting to the starter template.
- [ ] **Backend-synced coding drafts** — move draft/checkpoint persistence from browser-local storage into the backend so students can resume work on any device.
- [x] **Teacher-selected starter language + optional lock** — teacher-selected language now reaches student view and optional lock prevents student language switching.
- [x] **HTML preview support** — HTML coding activities now render a preview pane so the standalone HTML option has an in-app visual result.
- [x] **Simple Autograder** — coding activities can now optionally store a teacher reference solution, compare normalized code and/or runtime output, run teacher-defined input/output checks, and auto-apply 100/50/0 grades that teachers can override.
- [ ] **Hidden/weighted autograder checks** — separate teacher-only hidden tests from student-visible checks and allow weighted scoring instead of the current coarse 100/50/0 buckets.
- [x] **Teacher review for coding submissions** — gradebook grading panel now loads coding submissions directly into the runnable editor for teacher debugging and feedback.

---

## P1 — Game design focus (Godot end-to-end)

- [ ] **Godot project pipeline** — support teacher upload and student submission of Godot starter projects.
- [ ] **Object storage integration** — add storage for project archives and other binary assets.
- [ ] **Godot embed/runtime validation** — ensure in-platform launch, run, and teacher review flows are stable for supported Godot project types.
- [ ] **Godot assignment packaging standards** — define required project structure, import rules, and submission bundle validation.

---

## P2 — UX/UI cleanup (sleek, modern, intuitive)

- [x] **VS Code-style file manager UX** — the Web Development Kit now ships with a side file tree plus a show/hide toggle, and the explorer starts collapsed to protect the editor/preview layout.
- [ ] **CRUD interface completeness** — make sure menu system has full functionality to edit, delete, hide, etc.
- [ ] **Indicator icons** — integrate icons to indicate states of activities, lessons, and units.
- [ ] **Drag-and-drop hierarchy management** — replace the current move-up/move-down course organizer with direct drag-and-drop reordering and cross-unit / cross-lesson moves.
- [ ] **Accessibility hardening** — complete a11y audit and fix critical findings.
- [ ] **Design consistency pass** — standardize spacing, typography, component states, and interaction feedback across the app.

---

## P3 — Pre-production hardening (auth, DB, reliability, operations)

- [ ] **Replace `x-user-id` auth** — implement real authentication/authorization for teacher and student accounts.
- [ ] **Support LMS SSO/LTI login integration** — after core platform auth is in place, add LMS-specific sign-in flows (for example LTI/SSO) required for district/platform adoption.
- [ ] **Backups and data durability** — enable managed backups and move off ephemeral/free DB tiers before real usage.
- [ ] **Environment parity** — keep `render.yaml` and live Render service settings fully aligned.
- [ ] **Error monitoring + structured logs** — add centralized error tracking and request-correlated backend logs.
- [ ] **E2E regression coverage** — automate smoke flows (login, coding run, submit, gradebook).
- [ ] **Frontend regression coverage for teacher hierarchy tools** — add automated browser coverage for edit/delete/visibility/reorder flows on units, lessons, and activities.

---

## P4 — Post-production enhancements

- [ ] **Advanced AI autograder** — use hosted AI with objective/requirements context to evaluate rubric alignment, code quality signals, and result correctness (advisory scoring with teacher override).
- [ ] **Additional CS learning tools** — integrate more computer science tools and open source programs for extended learning paths.
- [ ] **Cybersecurity VM track** — investigate virtual machine setup for cybersecurity programs.
- [ ] **Achievement system** — add profile achievements with in-app notifications and progress display.
