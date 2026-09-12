# Monaco Editor + Judge0 Code Execution Setup

This document explains how to configure the embedded Monaco editor and Judge0
code execution service for the edu-platform coding activity workflow.

## Current Status

- JavaScript and Python have been smoke-tested in the live editor flow and are currently the verified working languages.
- Additional language options remain available in the UI/backend mapping, but they still need end-to-end validation before being treated as confirmed classroom-ready.
- Recently implemented:
  - teacher-selected coding language now transfers end-to-end into the student activity view
  - teachers can lock activity language at setup so students cannot switch languages on locked assignments
  - grading panel now loads submitted coding work into an executable editor so teachers can run/debug while grading
  - student coding drafts auto-save in browser storage, can be checkpointed/restored, and can be reset back to the starter template
  - HTML activities now render a preview pane, and the web workspace is labeled **Web Development Kit** with the file explorer collapsed by default
  - executable coding activities can optionally enable an autograder with teacher reference code, no-input output checks, and teacher-authored input/output test cases that auto-apply 100/50/0 grades
- Planned follow-up work:
  - add a multi-file project workspace for non-web languages (for example Python + config/data files) with execution packaging
  - move coding draft persistence into backend storage so work follows students across devices
  - add step/stop debugging controls plus stronger runaway-execution controls around `/execute`
  - add hidden tests, weighted checks, and stronger structure analysis than the current normalized exact-code comparison

---

## Overview

Coding activities use the [Monaco Editor](https://microsoft.github.io/monaco-editor/)
(the same editor engine that powers VS Code) embedded directly in the platform — no
third-party iframe required. When a student clicks **Run**, the platform's own backend
forwards the code to a [Judge0](https://judge0.com) execution service and streams the
output back to the browser.

```
Browser (Monaco editor)
    → edu-platform-api (POST /execute)
        → Judge0 / Sulu (HTTPS)
            → stdout / stderr returned
    → output displayed in editor panel
```

If no Judge0 API key is configured for the RapidAPI endpoint, the editor still
loads but run requests return a clear configuration error from the backend.

---

## Available Language Options

| Language   | Judge0 ID |
|------------|-----------|
| JavaScript (Node.js 18) | 93 |
| TypeScript 5 | 94 |
| Python 3.11 | 92 |
| Java 17 | 91 |
| C (GCC 13) | 104 |
| C++ (GCC 13) | 105 |
| C# (Mono) | 51 |
| HTML | browser preview only |
| PHP | 68 |
| Ruby | 72 |
| Go | 95 |
| Rust | 73 |
| Swift | 83 |
| Kotlin | 78 |

> Verified today: **JavaScript** and **Python**. Treat the remaining options as provisional until each one is tested through the full browser → backend → Judge0 flow.

---

## Local Development Setup

### 1. Add environment variables to `backend/.env`

```dotenv
JUDGE0_API_KEY=your_rapidapi_key_here
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_REQUEST_TIMEOUT_MS=12000
```

Leave `JUDGE0_API_KEY` blank only if you are pointing `JUDGE0_API_URL` to a
self-hosted Judge0 instance that does not require RapidAPI authentication.

### 2. Get a free RapidAPI Judge0 key

Sulu is Judge0's hosted cloud service available through RapidAPI:

1. Go to **https://rapidapi.com/judge0-official/api/judge0-ce**
2. Sign up for a free RapidAPI account (no credit card required)
3. Subscribe to the **Basic** (free) tier
4. Copy your `X-RapidAPI-Key` from the Authorization section
5. Paste it as `JUDGE0_API_KEY` in your `.env`

The free tier allows ~50 code submissions per day — sufficient for local development
and small pilot testing.

### 3. Test the endpoint

```bash
curl -X POST http://localhost:3001/execute \
  -H 'Content-Type: application/json' \
  -H 'x-user-id: s-1' \
  -d '{"language":"javascript","code":"console.log(\"Hello, World!\")"}'
```

Expected response:
```json
{
  "stdout": "Hello, World!\n",
  "stderr": null,
  "compile_output": null,
  "status": { "id": 3, "description": "Accepted" },
  "time": "0.051",
  "memory": 8800
}
```

---

## Render Deployment Setup

The `render.yaml` blueprint is pre-configured with the two environment variable
definitions. You must supply the actual key value manually in the Render dashboard
(it is marked `sync: false` so it is never committed to the repository).

### Steps

1. Deploy the blueprint as normal (see `docs/render-deployment.md`)
2. In the Render dashboard, navigate to the **edu-platform-api** service
3. Go to **Environment → Environment Variables**
4. Set `JUDGE0_API_KEY` to your RapidAPI key
5. Set `JUDGE0_API_URL` to `https://judge0-ce.p.rapidapi.com` (already set as default in `render.yaml`)
6. Trigger a manual deploy (or the next push will pick it up automatically)

The `JUDGE0_API_KEY` value is intentionally absent from `render.yaml` and must
**never** be committed to the repository.

---

## Upgrading to Higher Capacity

### Option A: Sulu paid tier (no infrastructure change)

Visit **https://rapidapi.com/judge0-official/api/judge0-ce** and upgrade your
subscription. Only the `JUDGE0_API_KEY` env var needs to change — nothing else.

| Sulu tier | Approx. submissions/day | Monthly cost |
|-----------|------------------------|--------------|
| Basic (free) | ~50 | $0 |
| Hobby | ~5,000 | ~$20 |
| Pro | ~50,000 | ~$100 |

### Option B: Self-hosted Judge0 CE on Render

Self-hosting gives unlimited submissions and keeps all student code execution on
infrastructure you fully control.

1. Fork the [Judge0 CE repository](https://github.com/judge0/judge0)
2. Add a new **Docker** web service to your Render account (or add it to `render.yaml`)
3. Point `JUDGE0_API_URL` to your self-hosted service URL
4. Remove the `X-RapidAPI-*` headers from the proxy — Judge0 CE does not use them
   when self-hosted (update `backend/src/modules/execute/routes.ts` accordingly)

Estimated cost: **$7–25/month** for a Render Standard instance.

---

## Teacher Workflow: Creating a Coding Activity

1. **Step 1** — Select activity type: choose **Coding**
2. **Step 2** — Fill in title, description, due date, and points
3. **Step 3** — Write student directions (e.g. "Write a function that returns the sum of two numbers")
4. **Step 4** — Write starter code in the live Monaco editor
   - Select the programming language from the dropdown
   - Choose **Web Development Kit** for the bundled HTML/CSS/JS multi-file workspace
   - Write the starter code students will see when they open the activity
   - Optionally set **Expected Output**: if set, students see a ✓/✗ pass/fail indicator when they run their code
   - Optionally enable **Autograder** for executable languages:
     - paste the teacher's suggested solution into the reference editor
     - optionally run the reference solution with stdin to capture the expected stdout
     - choose one or more checks: normalized code match, no-input output match, and/or input/output test cases
     - saved submissions receive 100%, 50%, or 0% automatically based on whether all, some, or none of the selected checks pass
   - Click **Save activity**

The starter code and expected output are stored in the database (`activities.starter_code` and
`activities.expected_output`). There is no URL length limit — code of any size is supported.

---

## Student Workflow: Completing a Coding Activity

1. Open the coding activity — Monaco editor loads with the teacher's starter code pre-filled
2. Edit the code in the VS Code-identical environment
3. Drafts auto-save in browser storage while the student works; students can also create a few manual checkpoints, restore them, or reset back to the starter template
4. Click **▶ Run** — output appears in the panel beside the editor (HTML uses an in-app preview pane instead of Judge0 execution)
5. If the teacher set expected output: a green ✓ or red ✗ badge shows whether the output matches
6. Click **Submit activity** — the current editor code is automatically saved to the backend (no copy-paste required)
7. If the activity uses the autograder, the backend evaluates the submission and stores an auto-grade plus a breakdown of the checks that passed
8. Teacher can view the submitted code, autograder recommendation, and override the score in the gradebook

---

## Architecture Notes

- The `/execute` endpoint is intentionally a backend proxy. The Judge0 API key is
  **never exposed to the browser**.
- The `submission.content` JSON field stores `{ "responseText": "<code>" }` for code submissions, while activities now also store optional autograder reference configuration and grades can retain the latest autograder breakdown for teacher review.
- The Monaco editor component lives at `frontend/src/components/coding/MonacoEditor.tsx`
  and now also supports optional stdin when teachers run reference solutions while building an autograder.
- Teacher grading now reuses the same editor components to load and execute student submissions in-context while scoring.
- Draft/checkpoint persistence is currently browser-local (`localStorage`), so it survives refresh/navigation on the same device but is not yet synchronized across devices.
- If `JUDGE0_API_KEY` is missing while using the RapidAPI URL, the backend returns
  HTTP 503 with a configuration message so the failure is actionable.
- HTML and **Web Development Kit** activities still fall back to manual grading because they do not yet execute in the server-side Judge0 pipeline.

---

## Editor Feature Suggestions from Other Coding LMS Patterns

The following are high-value, LMS-oriented improvements observed across modern coding-learning workflows and should be considered for roadmap planning:

1. **Autosave + revision timeline**
   - Persist work-in-progress every few seconds and allow teachers to inspect revision history during grading.

2. **Built-in hidden test cases and weighted rubric checks**
   - Allow instructors to define teacher-only tests and weighted scoring instead of exposing or equally weighting every check.

3. **Pair-programming and live teacher assist mode**
   - Add optional collaborative sessions where teachers can join a student workspace in real time for intervention.

4. **Plagiarism and paste-detection telemetry**
   - Track large paste events and suspiciously abrupt solution changes for integrity review.

5. **Containerized per-assignment runtime profiles**
   - Let teachers pin language/runtime/dependency environments per assignment so all students execute in identical conditions.
