# Production Readiness Checklist

This checklist assesses whether the edu-platform is ready for classroom or school use. Last updated: September 2026.

## How to use this checklist

- Mark each item as:
  - `[x]` complete and verified
  - `[ ]` not complete
  - `[~]` partially complete / needs verification
- Revisit before each major release.
- **Blocker items** (marked with ⚠️) must be checked before production deployment.

---

## 1) Product Scope and Core LMS Flows

### Curriculum structure
- [~] Courses can be created, edited, hidden/shown, reordered, and deleted; archive/duplicate workflows pending.
  - **Note**: Hard delete works; soft-delete/archival not yet implemented.
- [x] Units can be reordered and hidden/shown.
- [x] Lessons can be reordered and hidden/shown.
- [x] Activities support multiple types consistently (coding, text, HTML, web).
- [ ] Activity previews match the student experience.
- [ ] Teachers can publish/unpublish content safely.
- [ ] Curriculum content can be reused across courses.

### Teacher workflows
- [ ] ⚠️ **Teacher account creation and login work reliably** — BLOCKER. Currently `x-user-id` header only (dev auth).
- [ ] Teachers can create assignments without technical assistance.
- [x] Teachers can edit due dates, points, directions, visibility.
- [x] Teachers can attach starter code/files/resources.
- [ ] Teachers can preview assignments before publishing.
- [x] Teachers can grade submissions from a single workflow (gradebook panel includes editor).
- [x] Teachers can override grades and leave feedback (autograder override + comments in grading panel).
- [ ] Teachers can filter and search student work.

### Student workflows
- [ ] ⚠️ **Students can log in and access the correct classes** — BLOCKER. Depends on real auth + roster management.
- [ ] Students can view assigned work clearly.
- [x] Students can submit work from all supported activity types.
- [x] Students can resubmit work (no submission limit enforced).
- [ ] Students can see grades, comments, progress.
- [ ] Students can understand late work status and deadlines.
- [x] Students can recover drafts or unfinished work on refresh (localStorage persistence).

**Summary**: Core workflows functional; blocked on authentication and roster management.

---

## 2) Authentication, Authorization, and Roles

### Identity and login
- [ ] ⚠️ **Production authentication is implemented** — BLOCKER.
  - **Current**: Dev header auth only (`x-user-id`).
  - **Required**: JWT, sessions, or OAuth.
  - **Target**: Teacher login (magic link/password) + student enrollment.
- [ ] Password reset / account recovery exists.
- [ ] SSO or school login support available (post-MVP).
- [ ] Session expiration and refresh behavior defined.
- [ ] Login errors clear and non-leaky.

### Role-based access control
- [~] Teacher, student, school admin roles recognized in schema; enforcement partial.
  - **Current**: Enrollment-based access checks in `/execute` and grade endpoints.
  - **Missing**: Comprehensive role-based middleware for all routes.
- [ ] Users cannot access data outside their course scope.
- [ ] Teachers cannot alter student records outside assigned classes.
- [ ] Admin actions restricted and auditable.
- [x] Permission checks covered by tests (enrollment cache tests in `app.test.ts`).

### Account lifecycle
- [ ] Users can be added, removed, deactivated safely.
- [ ] Rosters can be synced or imported (LMS integration or CSV).
- [ ] Duplicate users handled correctly.
- [ ] Deleted/inactive users do not retain access.

**Summary**: Roles exist; enforcement incomplete. Blocker for production.

---

## 3) Assessment, Grading, and Feedback

### Submission handling
- [~] Assignment submission works reliably for text, code, file-based work.
  - **Current**: Code submissions via `/execute` + `/activities/{id}/submissions` endpoints tested.
  - **Missing**: File upload handling, comprehensive E2E tests.
- [x] Submission timestamps stored correctly.
- [x] Resubmission rules defined (no limit; latest submission graded).
- [ ] Late submission handling correct (due date enforcement not tested).
- [x] Submission history retained (submissions table includes all attempts).

### Grading
- [~] Manual grading works end-to-end.
  - **Current**: Grading endpoint exists; not E2E tested from UI.
- [x] Autograding works end-to-end (3 submission E2E tests covering code/output matching).
- [x] Teachers can override autograder results (grade override preserves manual comment).
- [ ] Grade calculations consistent and explainable.
- [ ] Partial credit supported (currently 100/50/0 only; weighted scoring post-MVP).
- [x] Feedback/comments saved and visible (grade comment field in schema).

### Rubrics and reports
- [ ] Rubrics can be attached to assignments.
- [ ] Rubric-based scoring supported.
- [ ] Gradebook exports available.
- [ ] Progress reporting accurate.
- [ ] Missing work clearly identified.

**Summary**: Basic autograding + manual override working; full E2E coverage and advanced rubrics pending.

---

## 4) Coding Environment Readiness

### Editor and runtime
- [x] Embedded editor loads reliably (Monaco editor via `@monaco-editor/react`).
- [x] Code execution works for verified languages (JavaScript, Python verified; 12+ provisional).
- [x] Language selection consistent between teacher setup and student view.
- [x] Language locking works correctly (teacher can lock language; student cannot switch).
- [x] Starter code loads correctly.
- [x] Run/submit flows stable.
- [~] Error messages understandable — Judge0 errors mapped; improvements possible for edge cases.

### Autograding for code
- [x] Autograder works for supported languages (JavaScript, Python tested).
- [ ] Hidden tests available (100/50/0 scoring only; hidden/weighted tests post-MVP).
- [x] Output matching behaves predictably (normalized whitespace comparison).
- [x] Code matching behaves predictably (AST normalization or token comparison).
- [x] Teachers can understand why submission passed/failed (autograder result breakdown in grade record).
- [x] Unsupported activity types fall back safely (HTML/web activities → manual grading).

### Execution safety
- [x] Timeouts enforced (`EXEC_TIMEOUT_MS` configurable; 1–60 seconds; timeout tests pass).
- [~] Memory limits enforced (Judge0 enforces; not independently validated by platform).
- [x] Output size limits enforced (UTF-8 safe truncation at `EXEC_MAX_OUTPUT_KB`).
- [x] Infinite loops/runaway execution handled (timeout + retry logic).
- [x] Student code cannot access server secrets (Judge0 sandbox; no environment injection).
- [x] Execution service failures handled gracefully (502/503 retried; fallback error responses).

### Draft persistence
- [x] Drafts survive refreshes (localStorage).
- [x] Drafts survive browser navigation (localStorage).
- [x] Drafts can be restored reliably (checkpoint/restore UX).
- [ ] Drafts synchronized across devices (backend sync pending; localStorage only currently).
- [x] Draft reset behavior safe and obvious (reset-to-starter affordance).

**Summary**: Execution environment production-ready; language coverage matrix needs formal approval.

---

## 5) Data Model and Persistence

### Database integrity
- [ ] ⚠️ **Migrations repeatable and reliable** — BLOCKER. NOT TESTED.
  - **Action required**: Test each migration on fresh DB; verify rollback works.
  - **Timeline**: Complete 1 week before pilot.
- [x] Seed data reflects real workflows (demo users, courses, activities seeded on DB init).
- [ ] Foreign keys and constraints correct (schema exists; runtime validation not tested).
- [x] Data types appropriate (timestamps, grades, submissions correctly typed).
- [ ] Soft-delete/archival behavior defined (currently hard-delete only; archival pending).

### Backups and recovery
- [ ] ⚠️ **Automated backups enabled** — BLOCKER. Currently ephemeral free-tier DB.
  - **Action required**: Move to Render Standard PostgreSQL; enable daily backups.
  - **Timeline**: Complete 1 week before pilot.
- [ ] Restore procedures tested.
- [ ] Data retention policy defined (no policy currently; FERPA requirements not documented).
- [ ] Disaster recovery expectations documented.
- [ ] Rollback plan for bad deployments documented (basic; CI/CD not fully automated).

### Multi-tenant / school separation
- [ ] School/organization boundaries enforced (single-tenant MVP; not yet needed).
- [ ] Shared resources explicitly controlled.
- [ ] Cross-school access impossible by default.
- [ ] Tenant-aware queries tested.

**Summary**: Schema solid; migrations/backups/archival BLOCKERS for production.

---

## 6) Security and Privacy

### Security basics
- [x] Secrets never committed (`.env.example` provided; API keys managed via Render env vars).
- [x] Environment variables managed securely (Render dashboard; secrets not in `render.yaml`).
- [ ] Input validation on all endpoints (Zod schemas in place for `/execute`; not comprehensive).
- [ ] File uploads sanitized (not yet implemented).
- [ ] SSRF/XSS/injection risks reviewed (basic; no formal security audit done).
- [x] CSRF protections in place (CORS configured; SameSite cookies default).
- [x] Rate limiting exists for sensitive endpoints (`/execute` has 3-tier rate limiting).

### Privacy and compliance
- [ ] Student data handling policy documented.
- [ ] FERPA/COPPA considerations reviewed (not formally addressed).
- [ ] Data retention and deletion rules defined (soft-delete pending).
- [ ] Audit logs available for sensitive actions (grade changes, admin actions not logged).
- [ ] Access logs reviewable for incidents (Render default logs; no centralized audit).
- [ ] Personally identifiable information minimized.

### Permissions and auditing
- [ ] Admin actions logged.
- [ ] Grade changes logged.
- [ ] Submission edits logged.
- [ ] Account access changes logged.
- [ ] Suspicious activity investigation possible.

**Summary**: Basic security posture; formal compliance audit required for school deployment.

---

## 7) Reliability and Operational Readiness

### Application stability
- [x] App starts cleanly in production (Render deployments succeed; seeding on first boot works).
- [x] Health checks available (`/health` endpoint; execution config status reported).
- [x] Dependency failures handled gracefully (Judge0 upstream failures retried + mapped to errors).
- [ ] Background jobs reliable (no background jobs yet; async task queue post-MVP).
- [x] App degrades safely (execution unavailability → 503 with clear message).

### Monitoring
- [x] Application logs structured (`execute_` metrics with request/user/course context).
- [ ] Error tracking enabled (Sentry/Datadog integration pending).
- [ ] Performance monitoring enabled (basic Render metrics; no custom dashboards).
- [ ] Alerts for critical outages (not configured).
- [ ] Key business metrics visible (execution success/failure counts logged; not visualized).

### Deployment
- [x] Deployments repeatable (Render blueprint + `render.yaml` automated).
- [x] Production configuration documented (see `docs/render-deployment.md`, `docs/deployment/env.md`).
- [~] Rollbacks straightforward (Render deploy history available; manual process).
- [~] Deployments don't interrupt active classroom use (depends on deployment timing; no blue-green/canary yet).
- [x] Environment parity (dev, staging, production configs aligned via `render.yaml`).

**Summary**: Stability good; monitoring/alerting needs completion.

---

## 8) Testing and Quality Assurance

### Automated tests
- [x] **Unit tests cover core business logic** ✅ VERIFIED.
  - `backend/src/app.test.ts`: 1,607 lines; 40+ tests covering:
    - Execution config validation (startup, missing keys, invalid URLs)
    - Rate limiting (burst, sustained, course-level, 429 contract)
    - Multi-file workspace normalization + entrypoint resolution
    - Timeout + retry + upstream error mapping
    - Output truncation (including UTF-8 boundaries)
    - Autograder submission workflows (manual override preservation)
    - Judge0 integration (RapidAPI vs self-hosted headers)
    - Permission enforcement (enrollment cache, course isolation)
    - Payload size limits
  - **Verdict**: Production-grade regression test suite.

- [x] **API tests cover primary workflows** ✅ VERIFIED.
  - `/health`, `/me`, `/execute`, `/courses`, `/activities/{id}/submissions` tested end-to-end.

- [x] **Permission tests cover role boundaries** ✅ VERIFIED.
  - Enrollment cache + course isolation tests in `app.test.ts`.

- [x] **Autograder and code execution tests exist** ✅ VERIFIED.
  - 3+ autograder submission tests (code match, output match, partial credit).
  - 6+ execution flow tests (timeout, retry, rate limit, workspace).

- [ ] Regression tests for previous bugs (minimal; add as issues found).

### End-to-end coverage
- [ ] ⚠️ **Teacher workflow E2E tests exist** — BLOCKER.
  - Create course → create activity → set autograder not tested via UI.
- [ ] ⚠️ **Student workflow E2E tests exist** — BLOCKER.
  - Open activity → edit → run → submit not tested via UI.
- [ ] ⚠️ **Submission and grading E2E tests exist** — BLOCKER.
  - Teacher grading panel workflow not UI-tested.
- [ ] ⚠️ **Coding activity execution E2E tests exist** — BLOCKED.
  - `/execute` API tested; full browser flow (editor → run button → output) not tested.
- [ ] Critical browser/device combinations tested (not yet defined).

**Action required**: Add Playwright or Cypress E2E suite covering 3–5 critical workflows. **Timeline**: 2 sprints.

### Release quality
- [ ] CI runs on every pull request (GitHub Actions setup unclear; no `.github/workflows` visible).
- [ ] Builds fail on test failure (not configured in CI).
- [ ] Linting and type checking enforced (`oxlint`, `tsc` in `package.json`; not in CI).
- [ ] Release notes generated (no CHANGELOG or release automation).
- [ ] Known issues tracked (GitHub issues/discussions not reviewed).

**Summary**: Unit + integration tests excellent; **E2E coverage is BLOCKER**. CI/CD not fully automated.

---

## 9) Accessibility and Usability

### Accessibility
- [ ] ⚠️ **Keyboard navigation works throughout app** — NOT TESTED. BLOCKER for school deployment.
- [ ] ⚠️ **Screen reader support acceptable** — NOT TESTED. BLOCKER for school deployment.
- [ ] ⚠️ **Color contrast meets standards** — NOT TESTED. BLOCKER for school deployment.
- [ ] ⚠️ **Focus states visible and consistent** — NOT TESTED. BLOCKER for school deployment.
- [ ] ⚠️ **Form errors accessible and descriptive** — NOT TESTED. BLOCKER for school deployment.
- [ ] ⚠️ **Editor and grading workflows usable without mouse** — NOT TESTED. BLOCKER for school deployment.

**Action required**: Run axe DevTools + manual keyboard navigation audit. Fix critical WCAG 2.1 A/AA violations. **Timeline**: 1 sprint.

### Usability
- [~] UI understandable for non-technical teachers (subjective; no user testing done).
- [~] Students can complete tasks without training (depends on pilot feedback).
- [ ] Important statuses obvious (submission status, grade status unclear).
- [ ] Empty states informative.
- [ ] Loading/error states clear.

**Summary**: No formal accessibility testing. BLOCKER for school deployment.

---

## 10) Browser, Device, and Network Compatibility

- [ ] Supported browsers documented.
- [ ] Mobile behavior defined (tablet/mobile support unclear).
- [ ] Low-bandwidth behavior acceptable.
- [ ] Slow-loading pages have feedback.
- [~] Code editor works across browsers (Monaco; likely good; not tested).
- [ ] External tools work behind school network (not tested).

---

## 11) Documentation and Support

### User-facing documentation
- [ ] Teacher setup guide exists.
- [ ] Student quick-start guide exists.
- [ ] Admin/setup guide exists (partial: `docs/render-deployment.md`).
- [ ] FAQ or troubleshooting guide exists.
- [x] Activity authoring docs current (see `docs/monaco-judge0-setup.md`).

### Internal documentation
- [ ] Architecture overview exists (wireframes in `docs/wireframes.md`; full architecture doc missing).
- [x] Deployment instructions current (`docs/render-deployment.md`, `docs/deployment/env.md`).
- [x] Environment variable reference complete (`docs/deployment/env.md`).
- [ ] Incident response steps documented.
- [ ] Contributor onboarding documentation exists.

### Support readiness
- [ ] Support process defined (who responds to bugs/feature requests?).
- [ ] Bug reporting straightforward (GitHub issues enabled).
- [ ] Feature requests tracked.
- [ ] Critical user problems triaged quickly.

**Summary**: Deployment docs good; user/support docs incomplete. Add before launch.

---

## 12) School Deployment Checklist

Before using the platform with a real school, verify:

- [ ] ⚠️ **Authentication is production-grade** — BLOCKER. Currently dev-only.
- [ ] ⚠️ **Course roster management complete** — BLOCKER. Not implemented (LMS import pending).
- [ ] Student privacy requirements satisfied (FERPA/COPPA review pending).
- [x] Teacher grading workflows reliable (tested; E2E coverage pending).
- [x] Coding execution safe and stable (tested; rate limits verified).
- [ ] ⚠️ **Backups and recovery tested** — BLOCKER. Currently ephemeral DB.
- [ ] ⚠️ **Logging and monitoring active** — Partially. Structured logs in place; Sentry/alerting pending.
- [ ] ⚠️ **Accessibility reviewed** — BLOCKER. Not done.
- [ ] Support ownership assigned.
- [ ] Rollback plan exists (basic; document before launch).

---

## 13) Suggested Readiness Gates

### Pilot-Ready Minimum
Classroom pilot with 1 teacher + 1 classroom (~20 students):
- [ ] ⚠️ **JWT or equivalent authentication** (teacher login + demo students)
- [ ] ⚠️ **Managed database + backups enabled**
- [ ] Core course/activity workflows (functional)
- [x] Code execution working (JavaScript/Python verified)
- [x] Autograder working (100/50/0 scoring)
- [x] Rate limiting + safety checks
- [ ] Basic E2E tests (teacher create → student run → teacher grade)
- [~] Monitoring + error tracking (structured logs + Sentry)
- [ ] Support contact + incident response plan
- [ ] Rollback procedure documented

**Effort to pilot-ready**: 6–7 sprints (~6–8 weeks from now).

### School-Ready Minimum
Broader school rollout (3–5 teachers, 100–200 students):
- [ ] Everything in pilot-ready +
- [ ] Comprehensive permission enforcement (role-based middleware)
- [ ] Roster import / CSV upload
- [ ] ⚠️ **Full WCAG 2.1 A/AA accessibility**
- [ ] Soft-delete / course archival
- [ ] E2E regression coverage (all critical workflows)
- [ ] Audit logging (grade changes, admin actions, access)
- [ ] Formal security review + penetration testing
- [ ] User documentation (teacher guide, student guide, admin guide)
- [ ] LMS SSO/LTI integration (if required)

**Effort beyond pilot**: 4–6 additional sprints (~2–3 months).

### District-Ready Minimum
District-wide deployment (multi-school, 1000+ students):
- [ ] Everything in school-ready +
- [ ] Multi-tenant isolation + school account management
- [ ] Formal compliance review (FERPA, COPPA, state data laws)
- [ ] Advanced monitoring + operational dashboards
- [ ] Load testing + horizontal scaling readiness
- [ ] Formal SLA + support structure
- [ ] Security hardening (rate limiting, input validation, audit logging on all sensitive actions)

**Timeline**: Post-launch (Q1 2027 or later).

---

## 14) Overall Assessment

### Scoring Model
- **0–25%**: prototype
- **26–50%**: functional MVP
- **51–75%**: pilot-ready
- **76–90%**: school-ready
- **91–100%**: production-hardened and district-ready

### Current Estimated Status (September 2026)

| Dimension | Score | Status | Blockers |
|-----------|-------|--------|----------|
| **Functional LMS Core** | 70% | Functional | Missing: auth, roster, archival |
| **Coding Execution** | 85% | Solid | Missing: language matrix approval, hidden tests |
| **Testing** | 65% | Good unit; weak E2E | **BLOCKER**: No E2E tests |
| **Data Durability** | 30% | At risk | **BLOCKERS**: Free DB, untested migrations, no backups |
| **Authentication** | 0% | Dev-only | **BLOCKER**: No production auth |
| **Accessibility** | 0% | Not assessed | **BLOCKER**: No a11y audit |
| **Monitoring/Ops** | 40% | Partial | Missing: Sentry, alerting, audit logs |
| **Documentation** | 50% | Partial | Missing: user guides, support process |
| **Overall** | **45%** | **Functional MVP** | **Blockers prevent school use** |

### Blocker Summary (MUST COMPLETE)
1. ⚠️ **Real authentication** (JWT or OAuth) — 2–3 sprints
2. ⚠️ **Managed database + backups** — 1 day config + 1 day testing
3. ⚠️ **Prisma migration testing** — 1 day
4. ⚠️ **E2E regression tests** — 2 sprints
5. ⚠️ **Accessibility audit + fixes** — 1 sprint
6. ⚠️ **Roster management** (CSV import or LMS sync) — 1–2 sprints

**Estimated effort to pilot-ready**: 6–8 weeks.

### Nice-to-Have Before Pilot
- Error monitoring (Sentry): 3–5 days
- Language coverage matrix approval: 2–3 days
- Advanced autograder (hidden/weighted): Post-pilot
- Backend draft sync: Post-pilot

### Recommended Next Steps (Priority Order)
1. **Week 1**: Database (managed tier + backups) + migration tests
2. **Week 2–3**: Real authentication (JWT) + demo login
3. **Week 4–5**: E2E test framework + critical workflow coverage
4. **Week 6**: A11y audit + quick fixes + error monitoring (Sentry)
5. **Week 7**: Final testing + documentation + rollback procedure
6. **Week 8**: Pilot launch

---

### Notes Section

**What is complete:**
- Execution environment (rate limiting, timeouts, safety)
- Multi-file projects + autograder (100/50/0)
- Browser localStorage persistence
- Comprehensive unit/integration tests (40+ tests, 1600+ lines)

**What is risky:**
- No production authentication (dev-only header auth)
- Ephemeral free database (data loss on Render outage)
- Untested Prisma migrations (potential data corruption on deploy)
- No E2E tests (UI regressions undetected)
- No accessibility audit (compliance risk)

**What should be validated next:**
- JWT authentication flow end-to-end
- Database migration + rollback procedure on Render
- Playwright E2E tests for critical workflows
- Keyboard navigation + screen reader testing
- Rate limiter under load (concurrent requests)
- Autograder override behavior with manual comments

**What should block release:**
- ⚠️ Production authentication not implemented
- ⚠️ Managed database backups not enabled
- ⚠️ Database migrations not tested
- ⚠️ E2E regression tests not implemented
- ⚠️ Accessibility audit not completed
- ⚠️ Roster management not implemented

**Post-Pilot Roadmap (Q4 2026 – Q1 2027):**
- Hidden/weighted autograder checks
- Backend-synced coding drafts
- Advanced error monitoring + operational dashboards
- LMS SSO/LTI integration
- Multi-school account management (district-ready)
