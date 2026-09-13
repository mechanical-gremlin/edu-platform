# Production Readiness Checklist

This checklist is intended to help assess whether the edu-platform is ready for real classroom or school use.

## How to use this checklist

- Mark each item as:
  - `[x]` complete
  - `[ ]` not complete
  - `[~]` partially complete / needs verification
- Revisit the checklist before each major release.
- Treat any unchecked item in a critical section as a blocker for school deployment.

---

## 1) Product Scope and Core LMS Flows

### Curriculum structure
- [ ] Courses can be created, edited, archived, and duplicated
- [ ] Units can be reordered and hidden/shown
- [ ] Lessons can be reordered and hidden/shown
- [ ] Activities support multiple types consistently
- [ ] Activity previews match the student experience
- [ ] Teachers can publish/unpublish content safely
- [ ] Curriculum content can be reused across courses

### Teacher workflows
- [ ] Teacher account creation and login work reliably
- [ ] Teachers can create assignments without technical assistance
- [ ] Teachers can edit due dates, points, directions, and visibility
- [ ] Teachers can attach starter code/files/resources
- [ ] Teachers can preview assignments before publishing
- [ ] Teachers can grade submissions from a single workflow
- [ ] Teachers can override grades and leave feedback
- [ ] Teachers can filter and search student work

### Student workflows
- [ ] Students can log in and access the correct classes
- [ ] Students can view assigned work clearly
- [ ] Students can submit work from all supported activity types
- [ ] Students can resubmit work when allowed
- [ ] Students can see grades, comments, and progress
- [ ] Students can understand late work status and deadlines
- [ ] Students can recover drafts or unfinished work if they refresh the page

---

## 2) Authentication, Authorization, and Roles

### Identity and login
- [ ] Production authentication is implemented
- [ ] Password reset / account recovery exists
- [ ] SSO or school login support is available if required
- [ ] Session expiration and refresh behavior are defined
- [ ] Login errors are clear and non-leaky

### Role-based access control
- [ ] Teacher, student, school admin, and system admin roles are enforced
- [ ] Users cannot access data outside their course or school scope
- [ ] Teachers cannot alter student records outside assigned classes
- [ ] Admin actions are restricted and auditable
- [ ] Permission checks are covered by tests

### Account lifecycle
- [ ] Users can be added, removed, or deactivated safely
- [ ] Rosters can be synced or imported
- [ ] Duplicate users are handled correctly
- [ ] Deleted or inactive users do not retain inappropriate access

---

## 3) Assessment, Grading, and Feedback

### Submission handling
- [ ] Assignment submission works reliably for text, code, and file-based work
- [ ] Submission timestamps are stored correctly
- [ ] Resubmission rules are clearly defined and enforced
- [ ] Late submission handling is correct
- [ ] Submission history is retained

### Grading
- [ ] Manual grading works end to end
- [ ] Autograding works end to end
- [ ] Teachers can override autograder results
- [ ] Grade calculations are consistent and explainable
- [ ] Partial credit is supported where needed
- [ ] Feedback/comments are saved and visible to students

### Rubrics and reports
- [ ] Rubrics can be attached to assignments
- [ ] Rubric-based scoring is supported
- [ ] Gradebook exports are available
- [ ] Progress reporting is accurate
- [ ] Missing work is clearly identified

---

## 4) Coding Environment Readiness

### Editor and runtime
- [ ] Embedded editor loads reliably
- [ ] Code execution works for verified languages
- [ ] Language selection is consistent between teacher setup and student view
- [ ] Language locking works correctly
- [ ] Starter code loads correctly
- [ ] Run/submit flows are stable
- [ ] Error messages from execution are understandable

### Autograding for code
- [ ] Autograder works for supported languages
- [ ] Hidden tests or equivalent validation are available
- [ ] Output matching behaves predictably
- [ ] Code matching behaves predictably
- [ ] Teachers can understand why a submission passed or failed
- [ ] Unsupported activity types fall back safely to manual grading

### Execution safety
- [ ] Timeouts are enforced
- [ ] Memory limits are enforced
- [ ] Output size limits are enforced
- [ ] Infinite loops and runaway execution are handled safely
- [ ] Student code cannot access server secrets
- [ ] Execution service failures are handled gracefully

### Draft persistence
- [ ] Drafts survive refreshes
- [ ] Drafts survive browser navigation
- [ ] Drafts can be restored reliably
- [ ] Drafts are synchronized across devices if required
- [ ] Draft reset behavior is safe and obvious

---

## 5) Data Model and Persistence

### Database integrity
- [ ] Migrations are repeatable and reliable
- [ ] Seed data reflects real workflows
- [ ] Foreign keys and constraints are correct
- [ ] Data types are appropriate for grades, dates, and submissions
- [ ] Soft-delete or archival behavior is defined where needed

### Backups and recovery
- [ ] Automated backups are enabled
- [ ] Restore procedures are tested
- [ ] Data retention policy is defined
- [ ] Disaster recovery expectations are documented
- [ ] There is a rollback plan for bad deployments

### Multi-tenant / school separation
- [ ] School or organization boundaries are enforced
- [ ] Shared resources are explicitly controlled
- [ ] Cross-school access is impossible by default
- [ ] Tenant-aware queries are tested

---

## 6) Security and Privacy

### Security basics
- [ ] Secrets are never committed to the repository
- [ ] Environment variables are managed securely
- [ ] Input validation exists on all user-facing endpoints
- [ ] File uploads are sanitized and restricted
- [ ] SSRF / XSS / injection risks have been reviewed
- [ ] CSRF protections are in place where relevant
- [ ] Rate limiting exists for sensitive endpoints

### Privacy and compliance
- [ ] Student data handling policy is documented
- [ ] FERPA/COPPA considerations are reviewed if applicable
- [ ] Data retention and deletion rules are defined
- [ ] Audit logs are available for sensitive actions
- [ ] Access logs can be reviewed for incidents
- [ ] Personally identifiable information is minimized

### Permissions and auditing
- [ ] Admin actions are logged
- [ ] Grade changes are logged
- [ ] Submission edits are logged
- [ ] Account access changes are logged
- [ ] Suspicious activity can be investigated

---

## 7) Reliability and Operational Readiness

### Application stability
- [ ] The app starts cleanly in production
- [ ] Health checks are available
- [ ] Dependency failures are handled gracefully
- [ ] Background jobs are reliable
- [ ] The app degrades safely when external services fail

### Monitoring
- [ ] Application logs are structured
- [ ] Error tracking is enabled
- [ ] Performance monitoring is enabled
- [ ] Alerts exist for critical outages
- [ ] Key business metrics are visible

### Deployment
- [ ] Deployments are repeatable
- [ ] Production configuration is documented
- [ ] Rollbacks are straightforward
- [ ] Deployments do not interrupt active classroom use
- [ ] Environment parity exists between dev/staging/prod

---

## 8) Testing and Quality Assurance

### Automated tests
- [ ] Unit tests cover core business logic
- [ ] API tests cover primary workflows
- [ ] Permission tests cover role boundaries
- [ ] Autograder and code execution tests exist
- [ ] Regression tests exist for previous bugs

### End-to-end coverage
- [ ] Teacher workflow E2E tests exist
- [ ] Student workflow E2E tests exist
- [ ] Submission and grading E2E tests exist
- [ ] Coding activity execution E2E tests exist
- [ ] Critical browser/device combinations are tested

### Release quality
- [ ] CI runs on every pull request
- [ ] Builds fail on test failure
- [ ] Linting and type checking are enforced
- [ ] Release notes are generated or maintained
- [ ] Known issues are tracked before release

---

## 9) Accessibility and Usability

### Accessibility
- [ ] Keyboard navigation works throughout the app
- [ ] Screen reader support is acceptable
- [ ] Color contrast meets accessibility standards
- [ ] Focus states are visible and consistent
- [ ] Form errors are accessible and descriptive
- [ ] Editor and grading workflows remain usable without a mouse

### Usability
- [ ] The UI is understandable for non-technical teachers
- [ ] Students can complete common tasks without training
- [ ] Important statuses are obvious
- [ ] Empty states are informative
- [ ] Loading and error states are clear

---

## 10) Browser, Device, and Network Compatibility

- [ ] Supported browsers are documented
- [ ] Mobile behavior is defined if mobile is expected
- [ ] Low-bandwidth behavior is acceptable
- [ ] Slow-loading pages have clear feedback
- [ ] Code editor works across target browsers
- [ ] External tools work behind school network restrictions where possible

---

## 11) Documentation and Support

### User-facing documentation
- [ ] Teacher setup guide exists
- [ ] Student quick-start guide exists
- [ ] Admin/setup guide exists
- [ ] FAQ or troubleshooting guide exists
- [ ] Activity authoring docs are current

### Internal documentation
- [ ] Architecture overview exists
- [ ] Deployment instructions are current
- [ ] Environment variable reference is complete
- [ ] Incident response steps are documented
- [ ] Onboarding documentation exists for contributors

### Support readiness
- [ ] A support process is defined
- [ ] Bug reporting is straightforward
- [ ] Feature requests and issues are tracked
- [ ] Critical user problems can be triaged quickly

---

## 12) School Deployment Checklist

Before using the platform with a real school, verify:

- [ ] Authentication is production-grade
- [ ] Course roster management is complete
- [ ] Student privacy requirements are satisfied
- [ ] Teacher grading workflows are reliable
- [ ] Coding execution is safe and stable
- [ ] Backups and recovery are tested
- [ ] Logging and monitoring are active
- [ ] Accessibility has been reviewed
- [ ] Support ownership is assigned
- [ ] A rollback plan exists

---

## 13) Suggested Readiness Gates

### Pilot-ready
Minimum expectation for a limited classroom pilot:
- [ ] Core login and role access
- [ ] Course and assignment workflows
- [ ] Submission and grading flow
- [ ] Basic code execution if coding is part of the pilot
- [ ] Monitoring and backups
- [ ] A known support contact

### School-ready
Minimum expectation for a broader school rollout:
- [ ] Everything in pilot-ready
- [ ] Strong permission boundaries
- [ ] Roster management
- [ ] Accessibility review
- [ ] Stable deployment and rollback process
- [ ] Audit logging
- [ ] Documentation for teachers and admins

### District-ready
Minimum expectation for district-wide use:
- [ ] Everything in school-ready
- [ ] Compliance review
- [ ] SSO or identity integration
- [ ] Multi-tenant isolation
- [ ] Formal support and incident processes
- [ ] Security review and penetration testing
- [ ] Operational dashboards and alerting

---

## 14) Overall Assessment Template

Use this simple scoring model:

- **0–25%**: prototype
- **26–50%**: functional MVP
- **51–75%**: pilot-ready
- **76–90%**: school-ready
- **91–100%**: production-hardened and district-ready

### Current estimated status
- Functional LMS core: ______
- Pilot readiness: ______
- School readiness: ______
- District readiness: ______

### Notes
- What is missing:
- What is risky:
- What should be validated next:
- What should block release:
