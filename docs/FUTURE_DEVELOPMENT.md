# Future Development Notes

This document tracks known limitations and deferred features that require further investigation or resources before implementation.

---
### Changed to Monaco+Judge0 - Section not update yet 
## 1. StackBlitz / WebContainers Embedded Editor

**Status:** Replaced by OneCompiler. Retained here for reference.

**Issue:** StackBlitz relies on the WebContainers API, which requires specific cross-origin isolation HTTP response headers (`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`) to be set on the hosting server. Without these headers – even in Chromium-based browsers – the embedded editor displays an "Incompatible Web Browser" error instead of loading the preview pane.

**Root cause:** WebContainers uses `SharedArrayBuffer`, which browsers block unless the page is served in a secure, cross-origin-isolated context. Deploying the required headers on a static hosting provider (e.g., Render static sites) is non-trivial and may conflict with third-party embeds (videos, Godot editor) on the same page.

**Future investigation:**
- Evaluate whether adding COOP/COEP headers is feasible for the production Render deployment without breaking other embeds.
- Consider a StackBlitz-hosted workspace URL (e.g., `stackblitz.com/edit/...`) served in its own origin as an iframe once header isolation requirements are met.
- Re-evaluate StackBlitz for project-type activities where full-stack WebContainer support is valuable.

---

## 2. Persistent Student Code Saving

**Status:** Workaround in place (students paste/copy code into the submission text box manually).

**Issue:** Free, embeddable editors (OneCompiler, StackBlitz) do not provide an authenticated API to save and retrieve individual student code on the LMS's behalf. Students must manually copy their finished code into the submission box, which creates friction and risks accidental data loss.

**Future investigation:**
- Evaluate **Replit Teams for Education** (paid tier) – supports assignment distribution, persistent per-student workspaces, and teacher access for grading.
- Evaluate **GitHub Classroom** integration – ties coding exercises to GitHub repositories, giving teachers full commit history per student.
- Consider building a lightweight **server-side code storage endpoint** (POST `/submissions/:activityId/code`) that accepts code payloads sent via `window.postMessage` from the embedded editor iframe, allowing transparent auto-save without leaving the LMS.
- Investigate OneCompiler's Pro/Team tiers for any persistent storage APIs.

---

## 3. Godot In-Browser Embedding

**Status:** Kept on the activity page with a "Launch in New Window" button. Embedded panel intentionally left as a placeholder.

**Issue:** Embedding the full Godot Editor (`editor.godotengine.org`) in an iframe is currently non-functional due to the editor requiring top-level navigation control and cross-origin isolation that conflicts with the LMS page context.

**Future investigation:**
- Investigate **self-hosting a Godot web build** on a subdomain (e.g., `godot.edu-platform.example.com`) to control cross-origin headers independently of the main LMS.
- Explore the Godot Engine's **Export → Web** pipeline to serve student projects as sandboxed iframes for playback (not editing).
- Investigate whether the [Godot Web Editor](https://editor.godotengine.org) will expose a stable embedding/postMessage API in future releases.

---

## 4. Godot Starter Template / Student Project Workflow

**Status:** Not yet implemented.

**Desired workflow:**
1. Teacher uploads a `.zip` starter project or selects a template when creating a Godot activity.
2. When a student opens the activity, the starter project is automatically loaded into their Godot workspace.
3. When the student finishes, their project is packed as a `.zip` and saved back to the LMS database, accessible to the teacher for grading.

**Blockers:**
- Godot editor embedding must be resolved first (see §3 above).
- Requires a server-side file storage endpoint (object storage such as S3 / Render Disk) with per-student namespacing.
- Requires a Godot web export pipeline and postMessage handshake to trigger pack-and-upload from the browser.

**Future investigation:**
- Design a `/api/godot-projects` endpoint that accepts and returns zipped Godot projects per student per activity.
- Evaluate Render Disk or AWS S3 for binary project storage.
- Prototype the postMessage handshake between the LMS iframe shell and the Godot editor origin.

---

## 5. Coding Exercise – Teacher Starter Code (Advanced Scenarios)

**Status:** Basic implementation complete. The activity creation modal (Step 4 for coding activities) lets teachers choose a language and write starter code, which is baked into the OneCompiler embed URL via the `code` query parameter.

**Current limitation:** The starter code is URL-encoded in the `resourceUrl` field. Very large starter code snippets (> ~2 KB) may hit URL length limits in some browsers or proxies.

**Future investigation:**
- Store starter code in a dedicated database column (`activities.starter_code`) and inject it into the embed URL at request time via a server-side redirect or signed URL.
- Evaluate OneCompiler's API/Pro tier for programmatic workspace creation.
