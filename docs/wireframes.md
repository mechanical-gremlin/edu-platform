# Edu Platform Wireframes

## 1) Login Page
```
+--------------------------------------------------+
| Edu Platform                                     |
| "Curated CS learning paths"                     |
| [ Continue with Google (placeholder) ]          |
| [ Demo login as teacher ]                        |
| [ Demo login as student ]                        |
+--------------------------------------------------+
```

## 2) Teacher Dashboard (course grid + sidebar)
```
+---------------- Top Nav (logo/profile/settings) ----------------+
| Sidebar: Dashboard / Courses / Gradebook                        |
| +-------------------- Main Content ----------------------------+ |
| | Teacher Dashboard                                            | |
| | [Course Card] [Course Card] [Course Card]                    | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

## 3) Student Dashboard (course grid + sidebar)
```
+---------------- Top Nav (logo/profile/settings) ----------------+
| Sidebar: Dashboard / Courses                                    |
| +-------------------- Main Content ----------------------------+ |
| | Student Dashboard                                            | |
| | [Course Card] [Course Card]                                  | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

## 4) Course/Unit View (expandable Units → Lessons → Activities)
```
+-------------------- Course View --------------------------------+
| Unit ▸/▾                                                        |
|   Lesson ▸/▾                                                    |
|     [type] Activity title                                       |
|     [Teacher: Add/Edit/Delete inline]                           |
|   + Add new activity (teacher)                                  |
+-----------------------------------------------------------------+
```

## 5) Activity Detail View
```
+----------------- Activity Detail -------------------------------+
| [type pill] Activity Title                                      |
| Description                                                     |
| Due date / points                                               |
| Type-specific render block (video/coding/quiz/project/godot)    |
+-----------------------------------------------------------------+
```

## 6) Teacher Activity Creation Modal (multi-step)
```
Step 1: Choose activity type
Step 2: Enter details (title, due date, points, links)
Step 3: Directions/questions editor (WYSIWYG/HTML placeholder)
```

## 7) Gradebook View (teacher only)
```
+------------------- Gradebook -----------------------------------+
| Student | Activity | Score                                      |
| Avery   | Quiz 1   | 18/20                                      |
+-----------------------------------------------------------------+
```
