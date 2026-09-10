# Data Models

Defined in `frontend/src/types/models.ts`.

- `User`: teacher/student identity and role
- `Course`: class metadata and nested `Unit[]`
- `Unit`: nested `Lesson[]`
- `Lesson`: nested `Activity[]`
- `Activity`: type, due date, points, description, status by student
- `GradebookEntry`: teacher-facing score record by activity

## Mock Data Coverage

Defined in `frontend/src/mocks/data.ts`.

- Teacher + student sample accounts
- Multiple sample courses
- Full hierarchy (course → units → lessons → activities)
- Activity type examples:
  - `video`
  - `coding`
  - `quiz`
  - `project`
  - `godot`
- Gradebook sample rows
