import type { StarterFile } from '../types/models'
import {
  type ProjectWorkspaceValidationError,
  isPreviewRuntimeLanguage,
  normalizeProjectWorkspaceFiles,
  normalizeWorkspacePath,
  resolveDeterministicEntrypoint,
} from './projectWorkspace'

export type RuntimeProfile = 'code' | 'web'

export type ExecutionUiState =
  | 'idle'
  | 'running'
  | 'stepping'
  | 'stopping'
  | 'completed'
  | 'error'

export interface StepCapability {
  supported: boolean
  reason: string
}

export interface RuntimeProfileResolution {
  profile: RuntimeProfile
  target: string | null
  targetOptions: string[]
  error: ProjectWorkspaceValidationError | null
}

const RUNNABLE_EXTENSIONS_BY_LANGUAGE: Record<string, string[]> = {
  javascript: ['.js', '.mjs', '.cjs'],
  typescript: ['.ts'],
  python: ['.py'],
  java: ['.java'],
  c: ['.c'],
  cpp: ['.cpp', '.cc', '.cxx'],
  csharp: ['.cs'],
  php: ['.php'],
  ruby: ['.rb'],
  go: ['.go'],
  rust: ['.rs'],
  swift: ['.swift'],
  kotlin: ['.kt'],
}

const HTML_EXTENSIONS = ['.html', '.htm']

const matchesAnyExtension = (path: string, extensions: string[]) =>
  extensions.some((extension) => path.toLowerCase().endsWith(extension))

const toRuntimeDisplayName = (language: string) => {
  switch (language) {
    case 'javascript':
      return 'JavaScript'
    case 'typescript':
      return 'TypeScript'
    case 'csharp':
      return 'C#'
    case 'cpp':
      return 'C++'
    default:
      return language ? language[0].toUpperCase() + language.slice(1) : 'This'
  }
}

export const resolveRuntimeProfile = ({
  language,
  files,
  requestedEntrypoint,
  runtimeProfile,
}: {
  language: string
  files: StarterFile[]
  requestedEntrypoint?: string | null
  runtimeProfile?: RuntimeProfile | null
}): RuntimeProfile => {
  if (runtimeProfile === 'code' || runtimeProfile === 'web') {
    return runtimeProfile
  }

  if (isPreviewRuntimeLanguage(language)) {
    return 'web'
  }

  const normalizedFiles = normalizeProjectWorkspaceFiles(files)
  const resolvedEntrypoint = resolveDeterministicEntrypoint({
    language,
    files: normalizedFiles,
    requestedEntrypoint,
  }).entrypoint
  const candidateEntrypoint = resolvedEntrypoint ?? normalizeWorkspacePath(requestedEntrypoint ?? '')
  const hasHtmlFiles = normalizedFiles.some((file) => matchesAnyExtension(file.path, HTML_EXTENSIONS))
  const hasWebSupportFiles = normalizedFiles.some((file) =>
    matchesAnyExtension(file.path, ['.css', '.js', '.mjs', '.cjs', '.ts']),
  )

  if (
    (candidateEntrypoint && matchesAnyExtension(candidateEntrypoint, HTML_EXTENSIONS))
    || (hasHtmlFiles && hasWebSupportFiles)
  ) {
    return 'web'
  }

  return 'code'
}

export const getSelectableTargetOptions = ({
  language,
  files,
  runtimeProfile,
}: {
  language: string
  files: StarterFile[]
  runtimeProfile: RuntimeProfile
}) => {
  const normalizedFiles = normalizeProjectWorkspaceFiles(files)

  if (runtimeProfile === 'web') {
    return normalizedFiles
      .filter((file) => matchesAnyExtension(file.path, HTML_EXTENSIONS))
      .map((file) => file.path)
  }

  const runnableExtensions = RUNNABLE_EXTENSIONS_BY_LANGUAGE[language]
  if (!runnableExtensions?.length) {
    return normalizedFiles.map((file) => file.path)
  }

  return normalizedFiles
    .filter((file) => matchesAnyExtension(file.path, runnableExtensions))
    .map((file) => file.path)
}

export const resolveRuntimeTarget = ({
  language,
  files,
  requestedEntrypoint,
  runtimeProfile,
}: {
  language: string
  files: StarterFile[]
  requestedEntrypoint?: string | null
  runtimeProfile?: RuntimeProfile | null
}): RuntimeProfileResolution => {
  const profile = resolveRuntimeProfile({ language, files, requestedEntrypoint, runtimeProfile })
  const targetOptions = getSelectableTargetOptions({ language, files, runtimeProfile: profile })
  const normalizedRequested = requestedEntrypoint ? normalizeWorkspacePath(requestedEntrypoint) : null

  if (normalizedRequested && !targetOptions.includes(normalizedRequested)) {
    return {
      profile,
      target: null,
      targetOptions,
      error: {
        code: 'ENTRYPOINT_INVALID',
        message:
          profile === 'web'
            ? `Preview target "${normalizedRequested}" must be an HTML page in this workspace.`
            : `Run target "${normalizedRequested}" is not runnable for the ${toRuntimeDisplayName(language)} runtime.`,
      },
    }
  }

  if (targetOptions.length === 0) {
    return {
      profile,
      target: null,
      targetOptions,
      error: {
        code: 'ENTRYPOINT_MISSING',
        message:
          profile === 'web'
            ? 'Add an HTML page before previewing this workspace.'
            : `Add a runnable ${toRuntimeDisplayName(language)} file before executing this workspace.`,
      },
    }
  }

  const normalizedFiles = normalizeProjectWorkspaceFiles(files).filter((file) =>
    targetOptions.includes(file.path),
  )
  const resolved = resolveDeterministicEntrypoint({
    language: profile === 'web' ? 'web' : language,
    files: normalizedFiles,
    requestedEntrypoint: normalizedRequested,
  })

  return {
    profile,
    target: resolved.entrypoint,
    targetOptions,
    error: resolved.error,
  }
}

export const getStepCapability = ({
  language,
  runtimeProfile,
}: {
  language: string
  runtimeProfile: RuntimeProfile
}): StepCapability => {
  if (runtimeProfile !== 'code') {
    return {
      supported: false,
      reason: 'Step is only available for code runtimes.',
    }
  }

  return {
    supported: false,
    reason: `Step debugging is not available for ${toRuntimeDisplayName(language)} runtimes yet.`,
  }
}

export const isExecutionActive = (state: ExecutionUiState) =>
  state === 'running' || state === 'stepping' || state === 'stopping'

export const getExecutionControlState = ({
  executionState,
  hasValidTarget,
  stepCapability,
}: {
  executionState: ExecutionUiState
  hasValidTarget: boolean
  stepCapability: StepCapability
}) => ({
  runDisabled: !hasValidTarget || isExecutionActive(executionState),
  stepDisabled: !hasValidTarget || isExecutionActive(executionState) || !stepCapability.supported,
  stopDisabled: !(executionState === 'running' || executionState === 'stepping'),
})
