import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const users = [
  { id: 't-1', name: 'Ms. Ramirez', email: 'teacher@example.edu', role: 'teacher', avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=MR' },
  { id: 's-1', name: 'Avery Chen', email: 'student@example.edu', role: 'student', avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=AC' },
  { id: 's-2', name: 'Jordan Kim', email: 'jordan@example.edu', role: 'student', avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=JK' },
  { id: 's-3', name: 'Priya Patel', email: 'priya@example.edu', role: 'student', avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=PP' },
  { id: 's-4', name: 'Marcus Williams', email: 'marcus@example.edu', role: 'student', avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=MW' },
] as const

const courses = [
  { id: 'c-1', title: 'Game Development with Godot', code: 'CSP-201' },
  { id: 'c-2', title: 'Web Development Fundamentals', code: 'CSP-110' },
] as const

const enrollments = [
  ...courses.map((course) => ({ userId: 't-1', courseId: course.id, role: 'teacher' as const })),
  ...courses.flatMap((course) => ['s-1', 's-2', 's-3', 's-4'].map((userId) => ({ userId, courseId: course.id, role: 'student' as const }))),
]

const units = [
  { id: 'u-1', courseId: 'c-1', title: 'Unit 1: Core Programming Foundations', position: 0 },
  { id: 'u-2', courseId: 'c-1', title: 'Unit 2: Build a Platformer Prototype', position: 1 },
  { id: 'u-3', courseId: 'c-2', title: 'Unit 1: HTML + CSS Basics', position: 0 },
] as const

const lessons = [
  { id: 'l-1', unitId: 'u-1', title: 'Lesson 1: Variables and Input', position: 0 },
  { id: 'l-2', unitId: 'u-1', title: 'Lesson 2: Branching and Logic', position: 1 },
  { id: 'l-3', unitId: 'u-2', title: 'Lesson 1: Godot Scene Setup', position: 0 },
  { id: 'l-4', unitId: 'u-2', title: 'Lesson 2: Presentation & Reflection', position: 1 },
  { id: 'l-5', unitId: 'u-3', title: 'Lesson 1: Structure and Styling', position: 0 },
] as const

const activities = [
  {
    id: 'a-1',
    lessonId: 'l-1',
    title: 'Variables Video Walkthrough',
    type: 'video',
    dueAt: '2026-09-20T00:00:00.000Z',
    pointsPossible: 10,
    description: 'Watch and summarize how variable state changes in game loops.',
    directions: 'Watch the walkthrough video, pause to take notes on variable changes, and submit a 2-3 sentence summary of one example from the game loop.',
    resourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    visible: true,
    position: 0,
  },
  {
    id: 'a-2',
    lessonId: 'l-1',
    title: 'Coding Drill: Input and Output',
    type: 'coding',
    dueAt: '2026-09-21T00:00:00.000Z',
    pointsPossible: 20,
    description: 'Write a program that collects player name and score and prints a leaderboard row.',
    directions: 'Open the coding sandbox, write a short program that accepts a player name and score, and submit the share link or pasted code when you are done.',
    resourceUrl: 'https://onecompiler.com/embed/?theme=dark&hideNew=true',
    visible: true,
    position: 1,
  },
  {
    id: 'a-3',
    lessonId: 'l-2',
    title: 'Checkpoint Quiz: Conditionals',
    type: 'quiz',
    dueAt: '2026-09-23T00:00:00.000Z',
    pointsPossible: 25,
    description: 'Mixed multiple choice + short answer quiz.',
    directions: 'Answer the checkpoint questions in the response box. Include one short explanation of when to use an if/else branch.',
    visible: true,
    position: 0,
  },
  {
    id: 'a-4',
    lessonId: 'l-3',
    title: 'Godot Project: Player Movement',
    type: 'godot',
    dueAt: '2026-09-30T00:00:00.000Z',
    pointsPossible: 50,
    description: 'Launch project in browser-based Godot editor and submit playable prototype.',
    directions: 'Open the browser Godot editor, create a simple scene with a controllable player, and submit a project link or notes describing what you built.',
    resourceUrl: 'https://editor.godotengine.org/releases/latest/',
    visible: true,
    position: 0,
  },
  {
    id: 'a-5',
    lessonId: 'l-4',
    title: 'Mini Project: Pitch + Demo',
    type: 'project',
    dueAt: '2026-10-04T00:00:00.000Z',
    pointsPossible: 40,
    description: 'Upload demo link and design notes. Optional Blender/Spline asset showcase.',
    directions: 'Share a demo link plus a short reflection covering your design choices, player goal, and one improvement you would make next.',
    resourceUrl: 'https://www.canva.com/design/play',
    visible: false,
    position: 0,
  },
  {
    id: 'a-6',
    lessonId: 'l-5',
    title: 'Build a Personal Card',
    type: 'coding',
    dueAt: '2026-09-24T00:00:00.000Z',
    pointsPossible: 20,
    description: 'Create a responsive student profile card with semantic HTML and CSS.',
    directions: 'Build the profile card in the coding sandbox, then submit the live preview link and note which semantic tags you used.',
    resourceUrl: 'https://onecompiler.com/embed/?theme=dark&hideNew=true',
    visible: true,
    position: 0,
  },
] as const

const submissions = [
  { id: 'sub-a1-s1', studentId: 's-1', activityId: 'a-1', status: 'submitted', submittedAt: '2026-09-18T15:00:00.000Z', content: { responseText: 'Variables change as the loop reads input and updates score every frame.' } },
  { id: 'sub-a1-s2', studentId: 's-2', activityId: 'a-1', status: 'submitted', submittedAt: '2026-09-18T15:05:00.000Z', content: { responseText: 'I explained how health and score variables are updated after collisions.' } },
  { id: 'sub-a1-s3', studentId: 's-3', activityId: 'a-1', status: 'submitted', submittedAt: '2026-09-18T15:10:00.000Z', content: { responseText: 'The player speed variable changes when input is pressed inside the loop.' } },
  { id: 'sub-a1-s4', studentId: 's-4', activityId: 'a-1', status: 'submitted', submittedAt: '2026-09-18T15:15:00.000Z', content: { responseText: 'I summarized how counters and booleans get updated in the loop.' } },
  { id: 'sub-a2-s1', studentId: 's-1', activityId: 'a-2', status: 'submitted', submittedAt: '2026-09-19T10:00:00.000Z', content: { responseText: 'https://stackblitz.com/edit/demo-leaderboard-avery' } },
  { id: 'sub-a2-s2', studentId: 's-2', activityId: 'a-2', status: 'submitted', submittedAt: '2026-09-19T10:10:00.000Z', content: { responseText: 'https://stackblitz.com/edit/demo-leaderboard-jordan' } },
  { id: 'sub-a2-s3', studentId: 's-3', activityId: 'a-2', status: 'submitted', submittedAt: '2026-09-19T10:20:00.000Z', content: { responseText: 'Collected name + score and printed one leaderboard row in JS.' } },
  { id: 'sub-a3-s2', studentId: 's-2', activityId: 'a-3', status: 'submitted', submittedAt: '2026-09-20T08:30:00.000Z', content: { responseText: 'Use if/else when the game should only run one branch at a time.' } },
  { id: 'sub-a6-s1', studentId: 's-1', activityId: 'a-6', status: 'submitted', submittedAt: '2026-09-19T12:00:00.000Z', content: { responseText: 'https://stackblitz.com/edit/profile-card-avery' } },
  { id: 'sub-a6-s2', studentId: 's-2', activityId: 'a-6', status: 'submitted', submittedAt: '2026-09-19T12:05:00.000Z', content: { responseText: 'https://stackblitz.com/edit/profile-card-jordan' } },
  { id: 'sub-a6-s3', studentId: 's-3', activityId: 'a-6', status: 'submitted', submittedAt: '2026-09-19T12:10:00.000Z', content: { responseText: 'https://stackblitz.com/edit/profile-card-priya' } },
  { id: 'sub-a6-s4', studentId: 's-4', activityId: 'a-6', status: 'in_progress', submittedAt: null, content: { responseText: 'Started layout, still working on CSS alignment.' } },
] as const

const grades = [
  { studentId: 's-1', activityId: 'a-1', pointsEarned: 10, comment: 'Great summary of variable state!', gradedById: 't-1', gradedAt: '2026-09-19T16:00:00.000Z' },
  { studentId: 's-1', activityId: 'a-2', pointsEarned: null, comment: null, gradedById: 't-1', gradedAt: '2026-09-19T16:30:00.000Z' },
  { studentId: 's-1', activityId: 'a-6', pointsEarned: 19, comment: 'Nice work! Just watch semantic tag usage.', gradedById: 't-1', gradedAt: '2026-09-24T09:00:00.000Z' },
  { studentId: 's-2', activityId: 'a-1', pointsEarned: 9, comment: null, gradedById: 't-1', gradedAt: '2026-09-19T16:05:00.000Z' },
  { studentId: 's-2', activityId: 'a-2', pointsEarned: 18, comment: 'Good logic, small formatting issues.', gradedById: 't-1', gradedAt: '2026-09-21T10:00:00.000Z' },
  { studentId: 's-2', activityId: 'a-3', pointsEarned: 22, comment: null, gradedById: 't-1', gradedAt: '2026-09-23T10:00:00.000Z' },
  { studentId: 's-2', activityId: 'a-6', pointsEarned: 20, comment: 'Perfect!', gradedById: 't-1', gradedAt: '2026-09-24T09:10:00.000Z' },
  { studentId: 's-3', activityId: 'a-1', pointsEarned: 10, comment: null, gradedById: 't-1', gradedAt: '2026-09-19T16:10:00.000Z' },
  { studentId: 's-3', activityId: 'a-2', pointsEarned: null, comment: null, gradedById: 't-1', gradedAt: '2026-09-21T10:10:00.000Z' },
  { studentId: 's-3', activityId: 'a-6', pointsEarned: 17, comment: 'Good start. Review CSS flex layout.', gradedById: 't-1', gradedAt: '2026-09-24T09:20:00.000Z' },
  { studentId: 's-4', activityId: 'a-1', pointsEarned: 8, comment: 'Summary was brief. Try to elaborate.', gradedById: 't-1', gradedAt: '2026-09-19T16:20:00.000Z' },
] as const

async function main() {
  if (process.env.SEED_MODE !== 'if-empty') {
    await prisma.grade.deleteMany()
    await prisma.submission.deleteMany()
    await prisma.activity.deleteMany()
    await prisma.lesson.deleteMany()
    await prisma.unit.deleteMany()
    await prisma.enrollment.deleteMany()
    await prisma.course.deleteMany()
    await prisma.user.deleteMany()
  } else {
    const existingUsers = await prisma.user.count()

    if (existingUsers > 0) {
      return
    }
  }

  await prisma.user.createMany({ data: users as any })
  await prisma.course.createMany({ data: courses as any })
  await prisma.enrollment.createMany({ data: enrollments as any })
  await prisma.unit.createMany({ data: units as any })
  await prisma.lesson.createMany({ data: lessons as any })
  await prisma.activity.createMany({
    data: activities.map((activity) => ({
      ...activity,
      dueAt: new Date(activity.dueAt),
    })) as any,
  })
  await prisma.submission.createMany({
    data: submissions.map((submission) => ({
      ...submission,
      submittedAt: submission.submittedAt ? new Date(submission.submittedAt) : null,
    })) as any,
  })
  await prisma.grade.createMany({
    data: grades.map((grade) => ({
      ...grade,
      gradedAt: new Date(grade.gradedAt),
    })) as any,
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
