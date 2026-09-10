# Component Structure

## App Shell
- `src/App.tsx`: top-level view switching (login/dashboard/course/gradebook)
- `src/context/AppContext.tsx`: shared mock data + selected user/course/activity state
- `src/components/layout/DashboardLayout.tsx`: top nav + sidebar + content layout

## Navigation
- `src/components/navigation/TopNav.tsx`: logo/profile/settings area
- `src/components/navigation/SidebarNav.tsx`: role-based sidebar actions
- `src/hooks/useRoleNavigation.ts`: teacher vs student nav config

## Dashboard + Course Hierarchy
- `src/pages/DashboardPage.tsx`: course grid landing view
- `src/components/dashboard/CourseCard.tsx`: responsive course card + progress bar
- `src/pages/CoursePage.tsx`: hierarchy + detail split view
- `src/components/hierarchy/CourseHierarchy.tsx`: expandable units/lessons/activities
- `src/components/activity/ActivityCard.tsx`: activity row with type badge

## Activity Views
- `src/components/activity/ActivityDetail.tsx`: detail renderer with per-type copy
- `src/components/teacher/ActivityCreationModal.tsx`: teacher-only 3-step modal flow

## Gradebook
- `src/pages/GradebookPage.tsx`: teacher-only gradebook page
- `src/components/gradebook/GradebookTable.tsx`: score table
