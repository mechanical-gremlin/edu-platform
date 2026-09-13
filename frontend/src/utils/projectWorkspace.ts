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

const DEFAULT_FILE_CONTENT_BY_LANGUAGE: Record<string, string> = {
  web: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>My Page</title>\n  <link rel="stylesheet" href="style.css" />\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <script src="script.js"></script>\n</body>\n</html>',
  html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>',
  javascript: 'console.log("Hello, world!")\n',
  typescript: 'console.log("Hello, world!")\n',
  python: 'print("Hello, world!")\n',
  java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, world!");\n  }\n}\n',
  c: '#include <stdio.h>\n\nint main(void) {\n  printf("Hello, world!\\n");\n  return 0;\n}\n',
  cpp: '#include <iostream>\n\nint main() {\n  std::cout << "Hello, world!" << std::endl;\n  return 0;\n}\n',
  csharp: 'using System;\n\nConsole.WriteLine("Hello, world!");\n',
  php: '<?php\necho "Hello, world!\\n";\n',
  ruby: 'puts "Hello, world!"\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello, world!")\n}\n',
  rust: 'fn main() {\n    println!("Hello, world!");\n}\n',
  swift: 'print("Hello, world!")\n',
  kotlin: 'fun main() {\n    println("Hello, world!")\n}\n',
}

export const isPreviewRuntimeLanguage = (language: string) => language === 'web' || language === 'html'

export const getDefaultWorkspaceEntrypoint = (language: string) =>
  DEFAULT_ENTRYPOINT_BY_LANGUAGE[language] ?? 'main.txt'

export const buildDefaultWorkspaceFiles = (language: string, starterCode?: string | null): StarterFile[] => {
  const entrypoint = getDefaultWorkspaceEntrypoint(language)
  const content = starterCode ?? DEFAULT_FILE_CONTENT_BY_LANGUAGE[language] ?? ''

  if (language === 'web') {
    return [
      { path: 'index.html', language: 'html', content },
      {
        path: 'style.css',
        language: 'css',
        content: 'body {\n  font-family: sans-serif;\n  margin: 2rem;\n  background: #f9f9f9;\n}\n\nh1 {\n  color: #4f46e5;\n}\n',
      },
      {
        path: 'script.js',
        language: 'javascript',
        content: '// Your JavaScript goes here\nconsole.log("Hello from script.js");\n',
      },
    ]
  }

  return [{ path: entrypoint, language, content }]
}

export const buildDefaultWorkspaceState = (language: string, starterCode?: string | null) => {
  const files = buildDefaultWorkspaceFiles(language, starterCode)
  return {
    files,
    entrypoint: resolveDeterministicEntrypoint({
      language,
      files,
    }).entrypoint,
  }
}

export const shouldPersistProjectWorkspace = ({
  language,
  files,
  entrypoint,
}: {
  language: string
  files: StarterFile[]
  entrypoint: string | null
}) => {
  if (isPreviewRuntimeLanguage(language)) {
    return true
  }

  const defaultWorkspace = buildDefaultWorkspaceState(language)
  return (
    files.length !== 1
    || files[0]?.path !== defaultWorkspace.files[0]?.path
    || entrypoint !== defaultWorkspace.entrypoint
  )
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
