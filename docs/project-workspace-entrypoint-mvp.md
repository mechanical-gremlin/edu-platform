# Project workspace + entrypoint MVP

## Problem
The Web Development Kit needed a safer multi-file baseline that keeps the editor layout stable, simplifies file tree actions for beginner teachers, and guarantees a deterministic run target.

## Canonical model
- `project workspace files`: `Array<{ path: string; content: string; language?: string }>`
- `entrypoint`: explicit path string resolved against workspace files
- Backward compatibility: legacy `name`-based file records are normalized into `path` during read/write flows.

## Entrypoint rules
- Teacher starter project creation can set the entrypoint.
- Student draft restoration keeps the last saved entrypoint when available.
- Grading replay parity uses submission entrypoint first, then teacher starter project entrypoint.
- If runtime payload includes project workspace files, run resolution always validates an explicit deterministic run target.

## UX behavior
- File tree now uses a bounded split-pane layout and an overflow-safe editor container.
- File tree starts collapsed and opens as an overlay drawer on narrow screens.
- Beginner actions include New File, New Folder, collision-safe rename, and delete confirmation with path normalization.

## Execution contract
- `/execute` now accepts optional `files` and `entrypoint`.
- Multi-file payload validation returns structured errors:
  - `ENTRYPOINT_MISSING`
  - `ENTRYPOINT_INVALID`
  - `FILE_PATH_INVALID`
  - `EXECUTION_FAILED` (including unsupported runtime cases)
- Web Development Kit multi-file requests validate entrypoint existence before execution.

