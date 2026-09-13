import type { Course } from '../../types/models'
import { ActionMenu, type ActionMenuItem } from '../ui/ActionMenu'

interface CourseCardProps {
  course: Course
  progress: number
  onOpen: () => void
  actionItems?: ActionMenuItem[]
}

export const CourseCard = ({ course, progress, onOpen, actionItems = [] }: CourseCardProps) => (
  <div
    className={`rounded-2xl border border-slate-200 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow ${
      course.visible === false ? 'bg-slate-200/70 shadow-inner' : 'bg-white'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">{course.code}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900">{course.title}</h3>
          {course.visible === false && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Hidden</span>
          )}
        </div>
      </div>
      {actionItems.length > 0 && <ActionMenu ariaLabel={`Actions for course ${course.title}`} items={actionItems} />}
    </div>
    <button
      type="button"
      className="mt-2 w-full text-left"
      onClick={onOpen}
    >
      <p className="text-sm text-slate-600">Instructor: {course.teacherName}</p>

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
  </div>
)
