# Development TODO (Updated with Verified Status)

This list reflects the current state of development as of September 2026, with verified implementation status based on code review and testing coverage.

---

## P0 — Fully functional coding editor (all languages + project types)

- [x] **Production execution key configured** — set `JUDGE0_API_KEY` on the Render backend service so `/execute` can run student code in production.
- [x] **Execution timeout + retry hardening** — `/execute` now enforces request deadlines, retries transient Judge0 failures, and returns a stable error contract for timeout/upstream failures. Tested: 5+ timeout/retry scenarios.
- [x] **Execution payload/output limits** — `/execute` now rejects oversized source/stdin payloads and includes structured truncation metadata when output is capped. Truncation is UTF-8 safe.
- [x] **Execution rate limits** — fixed-window user burst + user sustained + shared course limits with deterministic `429` + `Retry-After` contract. Fully tested with 6+ integration tests covering burst, sustained, and course-level enforcement.
- [x] **Multi-file coding projects** — the shared coding workspace supports multi-file projects with deterministic entrypoint resolution and runnable target validation for both code runtimes and web environments.
- [x] **Run/step/stop debugging controls for coding runtimes** — code/runtime activities use explicit Target/Run/Step/Stop toolbar controls; web environments use separate preview-oriented affordances.
- [x] **Autosave coding work** — student coding drafts persist in browser localStorage; navigating away no longer clears in-progress editor.
- [x] **Checkpoint history + reset for coding drafts** — students can save local checkpoints, restore them, or reset to starter template.
- [x] **Restore submitted code into the editor** — reopening a coding assignment reloads the last submitted code/files instead of resetting to starter.
- [x] **Teacher-selected starter language + optional lock** — teacher-selected language transfers end-to-end to student view; optional lock prevents student language switching.
- [x] **HTML preview support** — HTML coding activities render an in-app preview pane with open-in-tab affordance for full-screen inspection.
- [x] **Simple Autograder** — coding activities optionally store teacher reference solution and run normalized code matching, output matching, and input/output test cases. Auto-apply 100/50/0 grades.
- [x] **Teacher review for coding submissions** — gradebook grading panel loads coding submissions directly into runnable editor for teacher debugging and real-time feedback.
- [ ] **Language/runtime coverage matrix** — define and validate officially supported languages/runtimes in MVP and production.
  - **Status**: JavaScript & Python verified end-to-end; 12+ others (Java, C++, C#, Go, Rust, etc.) available but marked "provisional" pending team validation.
  - **Blocker for school deployment**: Pick 2–3 additional languages and run full E2E flow.
- [ ] **Project template catalog** — provide starter templates by project type (single file, multi-file, web, game, config-driven).
- [ ] **Backend-synced coding drafts** — move draft/checkpoint persistence from browser localStorage to backend so work follows students across devices.
  - **Priority**: Post-MVP (affects UX if students use multiple devices; not essential for initial pilot).
  - **Effort**: 2 sprints.
- [ ] **Hidden/weighted autograder checks** — separate teacher-only hidden tests from student-visible checks; allow weighted scoring instead of 100/50/0.
  - **Priority**: Post-pilot (nice-to-have for school rollout; not blocking for MVP).
  - **Effort**: 2 sprints.

---

## P1 — Game design focus (Godot end-to-end)

- [ ] **Godot project pipeline** — support teacher upload and student submission of Godot starter projects.
- [ ] **Object storage integration** — add storage for project archives and other binary assets.
- [ ] **Godot embed/runtime validation** — ensure in-platform launch, run, and teacher review flows are stable for supported Godot project types.
- [ ] **Godot assignment packaging standards** — define required project structure, import rules, and submission bundle validation.

**Priority**: P4 (post-production enhancement; outside scope for MVP/pilot).

---

## P2 — UX/UI cleanup (sleek, modern, intuitive)

- [x] **VS Code-style file manager UX** — Web Development Kit ships with collapsible side file tree; explorer starts collapsed to protect editor/preview layout.
- [x] **CRUD interface completeness** — teachers can edit, delete, hide/show, and reorder courses, units, lessons, and activities; coding activity edits reuse full multi-step setup flow.
- [ ] **Indicator icons** — integrate icons to indicate states (draft, submitted, graded) of activities, lessons, units.
- [ ] **Drag-and-drop hierarchy management** — replace move-up/move-down with direct drag-and-drop reordering, including cross-unit/cross-lesson moves.
- [ ] **Accessibility hardening** — complete a11y audit and fix critical findings (keyboard nav, contrast, focus, screen reader support).
  - **Blocker for school deployment**: Must complete audit and fix critical issues.
  - **Effort**: 1 sprint (audit + fixes).
  - **Target**: WCAG 2.1 A/AA compliance.
- [ ] **Design consistency pass** — standardize spacing, typography, component states, interaction feedback across app.

---

## P3 — Pre-production hardening (auth, DB, reliability, operations)

- [ ] **Replace `x-user-id` auth** — implement real authentication/authorization for teacher and student accounts.
  - **BLOCKER for any production/pilot deployment**.
  - **Options**: JWT + refresh tokens, session-based, or OAuth (Google/GitHub).
  - **Minimum for pilot**: Teacher login (magic link or password), student roster import.
  - **Effort**: 2–3 sprints.
  - **Recommended approach**: JWT with demo teacher/student flows; add SSO/LMS integration in post-launch phase.

- [ ] **Support LMS SSO/LTI login integration** — after core platform auth, add LMS-specific sign-in flows (LTI/SSO) for district adoption.
  - **Priority**: Post-MVP (phase 2); required for formal school/district rollout.
  - **Effort**: 2 sprints (after core auth complete).

- [ ] **Backups and data durability** — enable managed backups and move off ephemeral/free DB tiers.
  - **BLOCKER for production**.
  - **Current state**: Free Render ephemeral PostgreSQL (no persistence).
  - **Action required before pilot**: Move to Render Standard PostgreSQL; enable automated daily backups; test restore procedure.
  - **Effort**: 1 day.
  - **Timeline**: Complete 1 week before pilot launch.

- [x] **Environment parity** — `render.yaml` and live Render service settings kept aligned. Documented in `docs/render-deployment.md`.

- [x] **Error monitoring + structured logs** — `/execute` logs include structured fields (requestId, userId, courseId, runtime, durationMs, outcome, errorCode). Metrics tags support monitoring.
  - **Current state**: Structured logs in place; **centralized error tracking (Sentry/Datadog) NOT implemented**.
  - **Recommended next step**: Integrate Sentry (free tier) for 5xx error tracking + autograder failure alerts.
  - **Effort**: 3–5 days.
  - **Priority**: High (improves observability in production).

- [ ] **E2E regression coverage** — automate smoke flows (login, coding run, submit, gradebook).
  - **BLOCKER for school deployment**.
  - **Current state**: None (only unit/integration API tests exist).
  - **Required**: 3–5 critical workflows via Playwright or Cypress:
    - Teacher create course → create coding activity → set autograder
    - Student open activity → edit code → run → submit
    - Teacher: view submitted code in grading panel
  - **Effort**: 2 sprints.
  - **Timeline**: Complete 2 weeks before pilot.

- [ ] **Frontend regression coverage for teacher hierarchy tools** — add automated browser coverage for edit/delete/visibility/reorder flows on courses, units, lessons, activities.
  - **Priority**: High (prevents UI regressions in core teacher workflow).
  - **Included in**: E2E regression coverage above.

- [ ] **Migrate Prisma config from package.json** — move `prisma` configuration to `prisma.config.ts` before Prisma 7 upgrade.
  - **Priority**: Medium (non-blocking; do before major version bump).
  - **Effort**: 1 day.

- [ ] **Framework/runtime expansion for the Web Development Kit** — evaluate optional presets (Bootstrap/Tailwind, Flask-backed web projects).
  - **Priority**: Post-MVP (nice-to-have for extended feature set).

---

## P3.5 — Data Model & Testing (NEW PRIORITY)

- [ ] **Database migrations tested** — verify all migrations are idempotent and reversible.
  - **BLOCKER for production**.
  - **Action required**: Test migrations on fresh DB; test rollback of each migration; add `npm run prisma:migrate:deploy` to CI.
  - **Effort**: 1 day.
  - **Timeline**: Complete 1 week before pilot.

- [ ] **Soft-delete / archival behavior defined** — courses/activities/submissions support archival without hard delete (preserves history, supports restore).
  - **Priority**: High (important for FERPA compliance and recovery).
  - **Action required**: Add `deletedAt` timestamp to Course, Activity, Submission tables; update queries to filter `WHERE deletedAt IS NULL`; add archive/restore endpoints.
  - **Effort**: 1.5 sprints.

---

## P4 — Post-production enhancements

- [ ] **Course sharing controls** — add safe teacher workflows for sharing courses/templates with other teachers/classes.
- [ ] **Course archive / restore controls** — support archiving courses without history loss; explicit restore/unarchive flows.
- [ ] **Advanced AI autograder** — use hosted AI to evaluate rubric alignment, code quality signals, result correctness (advisory scoring with teacher override).
- [ ] **Additional CS learning tools** — integrate more CS tools and open-source programs for extended learning paths.
- [ ] **Cybersecurity VM track** — investigate virtual machine setup for cybersecurity programs.
- [ ] **Achievement system** — add profile achievements with in-app notifications and progress display.

**Timeline**: All P4 items scheduled post-launch (Q1 2027 or later).

---

## Deployment Readiness Summary

### Pilot-Ready Blockers (Must Complete)
- [x] Execution environment (rate limits, timeouts, output handling)
- [x] Multi-file projects + entrypoint resolution
- [x] Autograder (basic 100/50/0 scoring)
- [x] Browser localStorage draft persistence
- [ ] **Real authentication (JWT or equivalent)** ← IN PROGRESS
- [ ] **Managed database + backups** ← IN PROGRESS
- [ ] **E2E regression tests** ← NOT STARTED
- [ ] **Accessibility audit + fixes** ← NOT STARTED
- [ ] **Prisma migration tests** ← NOT STARTED

### School-Ready Blockers (Complete by Q4 2026)
- [ ] Everything above +
- [ ] LMS roster import / SSO
- [ ] Soft-delete / archival
- [ ] Error monitoring (Sentry)
- [ ] Full accessibility (WCAG 2.1 AA)
- [ ] Comprehensive E2E + regression coverage

### Effort Estimate for Pilot Launch
- Auth (JWT): 2–3 sprints
- DB + backups: 1 day
- E2E tests: 2 sprints
- A11y audit + fixes: 1 sprint
- Prisma tests: 1 day
- **Total: 6–7 sprints (~6–8 weeks)**

Recommend **staggered delivery**: Auth + DB + core E2E (4 weeks) → pilot launch → accessibility + advanced autograder (post-pilot).
