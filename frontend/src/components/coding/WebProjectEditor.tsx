import type { StarterFile } from '../../types/models'
import { ProjectWorkspaceEditor } from './ProjectWorkspaceEditor'

interface WebProjectEditorProps {
  defaultFiles?: StarterFile[] | null
  defaultEntrypoint?: string | null
  onChange?: (files: StarterFile[], entrypoint: string | null) => void
  readOnly?: boolean
  entrypointEditable?: boolean
  height?: string
}

export const WebProjectEditor = (props: WebProjectEditorProps) => (
  <ProjectWorkspaceEditor language="web" runtimeProfile="web" {...props} />
)
