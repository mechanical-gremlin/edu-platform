import type { Activity, UpdateActivityInput } from '../../types/models'
import { ActivityCreationModal } from './ActivityCreationModal'

interface ActivityEditModalProps {
  open: boolean
  activity: Activity | null
  onClose: () => void
  onSave: (input: UpdateActivityInput) => Promise<void>
  executeUrl?: string
  runUserId?: string
  courseId?: string
}

export const ActivityEditModal = ({
  open,
  activity,
  onClose,
  onSave,
  executeUrl,
  runUserId,
  courseId,
}: ActivityEditModalProps) => (
  <ActivityCreationModal
    open={open}
    activity={activity}
    onClose={onClose}
    onSave={onSave}
    executeUrl={executeUrl}
    runUserId={runUserId}
    courseId={courseId}
  />
)
