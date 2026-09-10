import type { Course } from '../../types/models'

interface CourseCardProps {
  course: Course
  progress: number
  onOpen: () => void
}

export const CourseCard = ({ course, progress, onOpen }: CourseCardProps) => (
  <button
    className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow"
    onClick={onOpen}
  >
    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">{course.code}</p>
    <h3 className="mt-1 text-lg font-semibold text-slate-900">{course.title}</h3>
    <p className="mt-1 text-sm text-slate-600">Instructor: {course.teacherName}</p>

    <div className="mt-4">
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>Progress</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  </button>
)
