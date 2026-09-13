import type { StarterFile } from '../types/models'

export type ProjectWorkspaceErrorCode =
  | 'ENTRYPOINT_MISSING'
  | 'ENTRYPOINT_INVALID'
  | 'FILE_PATH_INVALID'

export interface ProjectWorkspaceValidationError {
  code: ProjectWorkspaceErrorCode
  message: string
}

const DEFAULT_ENTRYPOINT_BY_LANGUAGE: Record<string, string> = {
  web: 'index.html',
  html: 'index.html',
  javascript: 'index.js',
  typescript: 'index.ts',
  python: 'main.py',
  java: 'Main.java',
  c: 'main.c',
  cpp: 'main.cpp',
  csharp: 'Program.cs',
  php: 'index.php',
  ruby: 'main.rb',
  go: 'main.go',
  rust: 'main.rs',
  swift: 'main.swift',
  kotlin: 'Main.kt',
}

export const normalizeWorkspacePath = (value: string) => {
  const normalized = value.trim().replaceAll('\\', '/').replaceAll(/\/+/g, '/')
  if (!normalized || normalized.startsWith('/') || normalized.endsWith('/')) {
    return null
  }

  const segments = normalized.split('/')
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    return null
  }

  return segments.join('/')
}

export const normalizeProjectWorkspaceFiles = (files: StarterFile[]) =>
  files.reduce<StarterFile[]>((normalized, file) => {
    const path = normalizeWorkspacePath(file.path ?? file.name ?? '')
    if (!path) {
      return normalized
    }
    normalized.push({
      path,
      language: file.language,
      content: file.content,
    })
    return normalized
  }, [])

export const resolveDeterministicEntrypoint = ({
  language,
  files,
  requestedEntrypoint,
}: {
  language: string
  files: StarterFile[]
  requestedEntrypoint?: string | null
}) => {
  const normalizedFiles = normalizeProjectWorkspaceFiles(files)
  const filePathSet = new Set(normalizedFiles.map((file) => file.path))
  const normalizedRequested = requestedEntrypoint ? normalizeWorkspacePath(requestedEntrypoint) : null
  const defaultEntrypoint = DEFAULT_ENTRYPOINT_BY_LANGUAGE[language] ?? null
  const fallbackEntrypoint =
    (defaultEntrypoint && filePathSet.has(defaultEntrypoint) ? defaultEntrypoint : null)
    ?? normalizedFiles[0]?.path
    ?? null
  const resolvedEntrypoint = normalizedRequested ?? fallbackEntrypoint

  if (!resolvedEntrypoint) {
    return {
      entrypoint: null,
      error: {
        code: 'ENTRYPOINT_MISSING',
        message: 'An entrypoint is required before running this project workspace.',
      } satisfies ProjectWorkspaceValidationError,
    }
  }

  if (!filePathSet.has(resolvedEntrypoint)) {
    return {
      entrypoint: null,
      error: {
        code: 'ENTRYPOINT_INVALID',
        message: `Entrypoint "${resolvedEntrypoint}" does not match a file in this project workspace.`,
      } satisfies ProjectWorkspaceValidationError,
    }
  }

  return {
    entrypoint: resolvedEntrypoint,
    error: null,
  }
}
