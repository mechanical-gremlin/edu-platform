import type { Course, GradebookEntry, User } from '../types/models'

export const mockUsers: User[] = [
  {
    id: 't-1',
    name: 'Ms. Ramirez',
    email: 'teacher@example.edu',
    role: 'teacher',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=MR',
  },
  {
    id: 's-1',
    name: 'Avery Chen',
    email: 'student@example.edu',
    role: 'student',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=AC',
  },
]

export const mockCourses: Course[] = [
  {
    id: 'c-1',
    title: 'Game Development with Godot',
    code: 'CSP-201',
    teacherName: 'Ms. Ramirez',
    units: [
      {
        id: 'u-1',
        title: 'Unit 1: Core Programming Foundations',
        lessons: [
          {
            id: 'l-1',
            title: 'Lesson 1: Variables and Input',
            activities: [
              {
                id: 'a-1',
                title: 'Variables Video Walkthrough',
                type: 'video',
                dueDate: '2026-09-20',
                points: 10,
                description: 'Watch and summarize how variable state changes in game loops.',
                resourceUrl: 'https://www.youtube.com/',
                statusByUser: { 's-1': 'completed' },
              },
              {
                id: 'a-2',
                title: 'Coding Drill: Input and Output',
                type: 'coding',
                dueDate: '2026-09-21',
                points: 20,
                description: 'Write a program that collects player name and score and prints a leaderboard row.',
                statusByUser: { 's-1': 'in_progress' },
              },
            ],
          },
          {
            id: 'l-2',
            title: 'Lesson 2: Branching and Logic',
            activities: [
              {
                id: 'a-3',
                title: 'Checkpoint Quiz: Conditionals',
                type: 'quiz',
                dueDate: '2026-09-23',
                points: 25,
                description: 'Mixed multiple choice + short answer quiz.',
                statusByUser: { 's-1': 'not_started' },
              },
            ],
          },
        ],
      },
      {
        id: 'u-2',
        title: 'Unit 2: Build a Platformer Prototype',
        lessons: [
          {
            id: 'l-3',
            title: 'Lesson 1: Godot Scene Setup',
            activities: [
              {
                id: 'a-4',
                title: 'Godot Project: Player Movement',
                type: 'godot',
                dueDate: '2026-09-30',
                points: 50,
                description: 'Launch project in browser-based Godot editor and submit playable prototype.',
                statusByUser: { 's-1': 'not_started' },
              },
            ],
          },
          {
            id: 'l-4',
            title: 'Lesson 2: Presentation & Reflection',
            activities: [
              {
                id: 'a-5',
                title: 'Mini Project: Pitch + Demo',
                type: 'project',
                dueDate: '2026-10-04',
                points: 40,
                description: 'Upload demo link and design notes. Optional Blender/Spline asset showcase.',
                statusByUser: { 's-1': 'not_started' },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'c-2',
    title: 'Web Development Fundamentals',
    code: 'CSP-110',
    teacherName: 'Ms. Ramirez',
    units: [
      {
        id: 'u-3',
        title: 'Unit 1: HTML + CSS Basics',
        lessons: [
          {
            id: 'l-5',
            title: 'Lesson 1: Structure and Styling',
            activities: [
              {
                id: 'a-6',
                title: 'Build a Personal Card',
                type: 'coding',
                dueDate: '2026-09-24',
                points: 20,
                description: 'Create a responsive student profile card with semantic HTML and CSS.',
                statusByUser: { 's-1': 'completed' },
              },
            ],
          },
        ],
      },
    ],
  },
]

export const mockGradebookEntries: GradebookEntry[] = [
  {
    studentId: 's-1',
    studentName: 'Avery Chen',
    courseId: 'c-1',
    activityId: 'a-1',
    activityTitle: 'Variables Video Walkthrough',
    pointsEarned: 10,
    pointsPossible: 10,
  },
  {
    studentId: 's-1',
    studentName: 'Avery Chen',
    courseId: 'c-2',
    activityId: 'a-6',
    activityTitle: 'Build a Personal Card',
    pointsEarned: 19,
    pointsPossible: 20,
  },
]
