import { GradebookTable } from '../components/gradebook/GradebookTable'
import type { GradebookEntry } from '../types/models'

interface GradebookPageProps {
  entries: GradebookEntry[]
}

export const GradebookPage = ({ entries }: GradebookPageProps) => (
  <section className="space-y-4">
    <h2 className="text-2xl font-bold text-slate-900">Gradebook</h2>
    <p className="text-sm text-slate-600">Teacher-only grading overview with assignment scores.</p>
    <GradebookTable entries={entries} />
  </section>
)
