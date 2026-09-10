# Backend

Fastify + Prisma backend scaffold for the edu-platform teacher/student workflows.

## Prerequisites

- Node.js 22+
- Docker (for local PostgreSQL)

## Setup

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

The API starts on `http://localhost:3001` by default.

## Scripts

- `npm --prefix backend run dev`
- `npm --prefix backend run build`
- `npm --prefix backend run start`
- `npm --prefix backend run test`
- `npm --prefix backend run prisma:migrate`
- `npm --prefix backend run prisma:generate`
- `npm --prefix backend run prisma:seed`

## Dev auth

Provide `x-user-id` to simulate the authenticated user.

- Teacher: `t-1`
- Students: `s-1`, `s-2`, `s-3`, `s-4`

## Example requests

```bash
curl http://localhost:3001/health
curl -H 'x-user-id: t-1' http://localhost:3001/me
curl -H 'x-user-id: s-1' http://localhost:3001/courses
curl -H 'x-user-id: s-1' http://localhost:3001/courses/c-1
curl -X POST -H 'content-type: application/json' -H 'x-user-id: t-1' \
  -d '{"title":"Unit 3: Boss Battles","description":"New capstone unit"}' \
  http://localhost:3001/courses/c-1/units
curl -X PATCH -H 'content-type: application/json' -H 'x-user-id: t-1' \
  -d '{"visible":true}' \
  http://localhost:3001/activities/a-5/visibility
curl -X POST -H 'content-type: application/json' -H 'x-user-id: s-1' \
  -d '{"content":{"reflection":"Finished my walkthrough"}}' \
  http://localhost:3001/activities/a-1/submissions
curl -X PUT -H 'content-type: application/json' -H 'x-user-id: t-1' \
  -d '{"studentId":"s-1","activityId":"a-2","pointsEarned":20,"comment":"Nicely done"}' \
  http://localhost:3001/grades
```

## Notes

- The included seed data mirrors the current frontend mock users, courses, activities, submissions, and grades.
- Tests currently cover the health endpoint and protected-route auth smoke check. Next steps would be route-level integration tests against a disposable PostgreSQL instance.
