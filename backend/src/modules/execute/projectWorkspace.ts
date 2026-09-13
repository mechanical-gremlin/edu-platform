import { z } from 'zod'

export const projectWorkspaceFileSchema = z.object({
  path: z.string().trim().optional(),
  name: z.string().trim().optional(),
  content: z.string().max(50_000),
  language: z.string().trim().max(50).optional(),
})

export type ProjectWorkspaceFile = {
  path: string
  content: string
  language?: string
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

export const normalizeProjectWorkspaceFiles = (files: Array<z.infer<typeof projectWorkspaceFileSchema>>) => {
  const seenPaths = new Set<string>()
  const normalized: ProjectWorkspaceFile[] = []

  for (const file of files) {
    const rawPath = (file.path ?? file.name ?? '').trim()
    const path = normalizeWorkspacePath(rawPath)
    if (!path) {
      return { files: null, errorCode: 'FILE_PATH_INVALID' as const, errorMessage: `Invalid file path "${rawPath || '(empty)'}".` }
    }
    if (seenPaths.has(path)) {
      return { files: null, errorCode: 'FILE_PATH_INVALID' as const, errorMessage: `Duplicate file path "${path}".` }
    }
    seenPaths.add(path)
    normalized.push({ path, content: file.content, language: file.language })
  }

  return { files: normalized, errorCode: null, errorMessage: null }
}

export const resolveWorkspaceEntrypoint = ({
  language,
  files,
  requestedEntrypoint,
}: {
  language: string
  files: ProjectWorkspaceFile[]
  requestedEntrypoint?: string | null
}) => {
  const filePathSet = new Set(files.map((file) => file.path))
  const normalizedRequested = requestedEntrypoint ? normalizeWorkspacePath(requestedEntrypoint) : null
  const defaultEntrypoint = DEFAULT_ENTRYPOINT_BY_LANGUAGE[language] ?? null
  const fallbackEntrypoint =
    (defaultEntrypoint && filePathSet.has(defaultEntrypoint) ? defaultEntrypoint : null)
    ?? files[0]?.path
    ?? null
  const entrypoint = normalizedRequested ?? fallbackEntrypoint

  if (!entrypoint) {
    return {
      entrypoint: null,
      errorCode: 'ENTRYPOINT_MISSING' as const,
      errorMessage: 'An entrypoint is required for this project workspace.',
    }
  }

  if (!filePathSet.has(entrypoint)) {
    return {
      entrypoint: null,
      errorCode: 'ENTRYPOINT_INVALID' as const,
      errorMessage: `Entrypoint "${entrypoint}" does not exist in the project workspace.`,
    }
  }

  return { entrypoint, errorCode: null, errorMessage: null }
}

