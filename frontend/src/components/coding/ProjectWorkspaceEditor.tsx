import React, { useEffect, useId, useMemo, useRef, useState, type ComponentType } from 'react'
import MonacoEditorReact from '@monaco-editor/react'
import type { StarterFile } from '../../types/models'
import { getExecuteErrorMessage, type ExecuteErrorResponse } from './executeErrors'
import { ProjectWorkspaceToolbar } from './ProjectWorkspaceToolbar'
import {
  buildDefaultWorkspaceFiles,
  normalizeProjectWorkspaceFiles,
  normalizeWorkspacePath,
} from '../../utils/projectWorkspace'
import {
  getExecutionControlState,
  getStepCapability,
  resolveRuntimeTarget,
  type ExecutionUiState,
  type RuntimeProfile,
} from '../../utils/runtimeProfiles'

void React

const EXT_LANGUAGE: Record<string, string> = {
  c: 'c',
  cs: 'csharp',
  css: 'css',
  cpp: 'cpp',
  go: 'go',
  h: 'c',
  hpp: 'cpp',
  html: 'html',
  java: 'java',
  js: 'javascript',
  json: 'json',
  kt: 'kotlin',
  md: 'markdown',
  php: 'php',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  swift: 'swift',
  ts: 'typescript',
}

const limitBytesFromEnv = (envValue: unknown, fallbackKb: number) => {
  const parsed = Number.parseInt(String(envValue ?? ''), 10)
  const kb = Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackKb
  return kb * 1024
}

const utf8Encoder = new TextEncoder()
const maxSourceBytesLimit = limitBytesFromEnv(import.meta.env?.VITE_EXEC_MAX_SOURCE_KB, 64)
const maxStdinBytesLimit = limitBytesFromEnv(import.meta.env?.VITE_EXEC_MAX_STDIN_KB, 8)

interface ExecuteResult {
  stdout: string | null
  stderr: string | null
  compile_output: string | null
  truncation?: {
    stdout: { truncated: boolean; originalSizeBytes: number; maxSizeBytes: number }
    stderr: { truncated: boolean; originalSizeBytes: number; maxSizeBytes: number }
    compile_output: { truncated: boolean; originalSizeBytes: number; maxSizeBytes: number }
  }
  status: { id: number; description: string }
}

const langForFile = (path: string, fallbackLanguage: string) => {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return EXT_LANGUAGE[ext] ?? fallbackLanguage
}

const buildSrcdoc = (files: StarterFile[], entrypoint: string) => {
  const htmlFile =
    files.find((file) => file.path === entrypoint)
    ?? files.find((file) => file.path.endsWith('.html'))
  const cssBlocks = files
    .filter((file) => file.path.endsWith('.css'))
    .map((file) => `<style>/* ${file.path} */\n${file.content}\n</style>`)
    .join('\n')
  const jsBlocks = files
    .filter((file) => file.path.endsWith('.js'))
    .map((file) => `<script>\n${file.content}\n</script>`)
    .join('\n')

  if (htmlFile) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlFile.content, 'text/html')
    doc.querySelectorAll('link[rel="stylesheet"]').forEach((element) => element.remove())
    doc.querySelectorAll('script[src]').forEach((element) => element.remove())

    if (cssBlocks) {
      const wrapper = doc.createElement('template')
      wrapper.innerHTML = cssBlocks
      doc.head.appendChild(wrapper.content)
    }

    if (jsBlocks) {
      const wrapper = doc.createElement('template')
      wrapper.innerHTML = jsBlocks
      doc.body.appendChild(wrapper.content)
    }

    return doc.documentElement.outerHTML
  }

  return `<!DOCTYPE html><html><head>${cssBlocks}</head><body>${jsBlocks}</body></html>`
}

const getDirectoryPaths = (files: StarterFile[]) => {
  const directories = new Set<string>()
  for (const file of files) {
    const segments = file.path.split('/')
    for (let index = 1; index < segments.length; index += 1) {
      directories.add(segments.slice(0, index).join('/'))
    }
  }
  return directories
}

const getParentFolder = (path: string) => {
  const chunks = path.split('/')
  if (chunks.length <= 1) {
    return ''
  }
  return chunks.slice(0, -1).join('/')
}

const getLeafLabel = (path: string) => path.split('/').at(-1) ?? path

const areWorkspaceFilesEqual = (left: StarterFile[], right: StarterFile[]) => {
  if (left.length !== right.length) {
    return false
  }

  return left.every((file, index) => {
    const other = right[index]
    return (
      other
      && file.path === other.path
      && file.language === other.language
      && file.content === other.content
    )
  })
}

interface ProjectWorkspaceEditorProps {
  language: string
  defaultFiles?: StarterFile[] | null
  defaultEntrypoint?: string | null
  runtimeProfile?: RuntimeProfile | null
  onChange?: (files: StarterFile[], entrypoint: string | null) => void
  readOnly?: boolean
  entrypointEditable?: boolean
  fileTreeToggleVisible?: boolean
  height?: string
  executeUrl?: string
  userId?: string
  courseId?: string
  expectedOutput?: string | null
  stdin?: string
  showStdinField?: boolean
  onStdinChange?: (stdin: string) => void
  editorComponent?: ComponentType<{
    height: string
    language: string
    value: string
    onChange: (value: string | undefined) => void
    theme: string
    options: {
      readOnly: boolean
      minimap: { enabled: boolean }
      fontSize: number
      lineNumbers: 'on'
      scrollBeyondLastLine: boolean
      wordWrap: 'on'
      padding: { top: number; bottom: number }
    }
  }>
}

export const ProjectWorkspaceEditor = ({
  language,
  defaultFiles,
  defaultEntrypoint,
  runtimeProfile,
  onChange,
  readOnly = false,
  entrypointEditable = true,
  fileTreeToggleVisible = true,
  height = '500px',
  executeUrl,
  userId,
  courseId,
  expectedOutput,
  stdin = '',
  showStdinField = false,
  onStdinChange,
  editorComponent: EditorComponent = MonacoEditorReact,
}: ProjectWorkspaceEditorProps) => {
  const initialFiles = useMemo(
    () =>
    defaultFiles && defaultFiles.length > 0
      ? normalizeProjectWorkspaceFiles(defaultFiles)
      : buildDefaultWorkspaceFiles(language),
    [defaultFiles, language],
  )
  const [files, setFiles] = useState<StarterFile[]>(() => initialFiles)
  const [activePath, setActivePath] = useState(() => initialFiles[0]?.path ?? '')
  const [fileTreeOpen, setFileTreeOpen] = useState(false)
  const [folders, setFolders] = useState<string[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemType, setNewItemType] = useState<'file' | 'folder'>('file')
  const [showCreator, setShowCreator] = useState(false)
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [entrypoint, setEntrypoint] = useState<string | null>(
    () => defaultEntrypoint ?? initialFiles[0]?.path ?? null,
  )
  const [entrypointError, setEntrypointError] = useState<string | null>(null)
  const [pathError, setPathError] = useState<string | null>(null)
  const [previewDocument, setPreviewDocument] = useState('')
  const [previewDirty, setPreviewDirty] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [executionState, setExecutionState] = useState<ExecutionUiState>('idle')
  const [runError, setRunError] = useState<string | null>(null)
  const [truncationNotice, setTruncationNotice] = useState<string | null>(null)
  const [passed, setPassed] = useState<boolean | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [previewNewTabUrl, setPreviewNewTabUrl] = useState<string | null>(null)
  const prevDefaultsRef = useRef<{
    files: StarterFile[] | null | undefined
    entrypoint: string | null | undefined
    language: string
    runtimeProfile: RuntimeProfile | null | undefined
  }>({
    files: undefined,
    entrypoint: undefined,
    language,
    runtimeProfile,
  })
  const abortControllerRef = useRef<AbortController | null>(null)
  const executionTokenRef = useRef(0)
  const fileTreeId = useId()
  const targetSelectId = useId()
  const showFileTree = fileTreeToggleVisible && fileTreeOpen

  const directorySet = useMemo(() => {
    const computed = getDirectoryPaths(files)
    for (const folder of folders) {
      computed.add(folder)
    }
    return computed
  }, [files, folders])
  const sortedFolders = useMemo(
    () => Array.from(directorySet).sort((left, right) => left.localeCompare(right)),
    [directorySet],
  )
  const sortedFiles = useMemo(
    () => [...files].sort((left, right) => left.path.localeCompare(right.path)),
    [files],
  )
  const activeFile = files.find((file) => file.path === activePath) ?? files[0] ?? null
  const workspacePayload = useMemo(
    () => JSON.stringify({ files, entrypoint }),
    [entrypoint, files],
  )
  const sourceBytes = useMemo(() => utf8Encoder.encode(workspacePayload).length, [workspacePayload])
  const stdinBytes = useMemo(() => utf8Encoder.encode(stdin ?? '').length, [stdin])
  const preflightWarning =
    sourceBytes > maxSourceBytesLimit
      ? `Project source exceeds the ${Math.round(maxSourceBytesLimit / 1024)} KB limit.`
      : stdinBytes > maxStdinBytesLimit
        ? `Program input exceeds the ${Math.round(maxStdinBytesLimit / 1024)} KB limit.`
        : null
  const runtimeTarget = useMemo(
    () =>
      resolveRuntimeTarget({
        language,
        files,
        requestedEntrypoint: entrypoint,
        runtimeProfile,
      }),
    [entrypoint, files, language, runtimeProfile],
  )
  const resolvedRuntimeProfile = runtimeTarget.profile
  const showPreview = resolvedRuntimeProfile === 'web'
  const showExecution = Boolean(executeUrl && resolvedRuntimeProfile === 'code')
  const stepCapability = useMemo(
    () => getStepCapability({ language, runtimeProfile: resolvedRuntimeProfile }),
    [language, resolvedRuntimeProfile],
  )
  const executionControls = useMemo(
    () =>
      getExecutionControlState({
        executionState,
        hasValidTarget: Boolean(runtimeTarget.target),
        stepCapability,
      }),
    [executionState, runtimeTarget.target, stepCapability],
  )
  const stopHelpText =
    showExecution && (executionState === 'running' || executionState === 'stopping')
      ? 'Stop cancels this editor request. Backend execution may continue until its normal timeout.'
      : null

  const cancelActiveExecution = () => {
    if (!abortControllerRef.current) {
      return
    }
    executionTokenRef.current += 1
    abortControllerRef.current.abort()
    abortControllerRef.current = null
  }

  const refreshPreview = (nextFiles = files, nextEntrypoint = entrypoint) => {
    const nextTarget = resolveRuntimeTarget({
      language,
      files: nextFiles,
      requestedEntrypoint: nextEntrypoint,
      runtimeProfile,
    })

    if (!nextTarget.target) {
      setPreviewDocument('')
      setEntrypointError(nextTarget.error?.message ?? null)
      setPreviewDirty(false)
      return
    }
    setPreviewDocument(buildSrcdoc(nextFiles, nextTarget.target))
    setPreviewDirty(false)
  }

  const applyWorkspace = (
    nextFiles: StarterFile[],
    requestedEntrypoint: string | null,
    options?: { normalizeFiles?: boolean; refreshPreview?: boolean },
  ) => {
    const candidateFiles = options?.normalizeFiles === false
      ? nextFiles
      : normalizeProjectWorkspaceFiles(nextFiles)
    const resolved = resolveRuntimeTarget({
      language,
      files: candidateFiles,
      requestedEntrypoint,
      runtimeProfile,
    })

    cancelActiveExecution()
    setFiles(candidateFiles)
    setEntrypoint(resolved.target)
    setEntrypointError(resolved.error?.message ?? null)
    onChange?.(candidateFiles, resolved.target)

    if (resolved.profile === 'web') {
      if (options?.refreshPreview) {
        refreshPreview(candidateFiles, resolved.target)
      } else {
        setPreviewDirty(true)
      }
    } else {
      setPreviewDirty(false)
    }
  }

  useEffect(() => {
    const defaultsChanged =
      !initialized
      || defaultFiles !== prevDefaultsRef.current.files
      || defaultEntrypoint !== prevDefaultsRef.current.entrypoint
      || language !== prevDefaultsRef.current.language
      || runtimeProfile !== prevDefaultsRef.current.runtimeProfile

    if (!defaultsChanged) {
      return
    }

    prevDefaultsRef.current = {
      files: defaultFiles,
      entrypoint: defaultEntrypoint,
      language,
      runtimeProfile,
    }
    const nextFiles =
      defaultFiles && defaultFiles.length > 0
        ? normalizeProjectWorkspaceFiles(defaultFiles)
        : buildDefaultWorkspaceFiles(language)
    const resolved = resolveRuntimeTarget({
      language,
      files: nextFiles,
      requestedEntrypoint: defaultEntrypoint,
      runtimeProfile,
    })

    if (
      initialized
      && areWorkspaceFilesEqual(nextFiles, files)
      && resolved.target === entrypoint
    ) {
      return
    }

    cancelActiveExecution()
    setFiles(nextFiles)
    setFolders([])
    setSelectedFolder('')
    setActivePath(nextFiles[0]?.path ?? '')
    setEntrypoint(resolved.target)
    setEntrypointError(resolved.error?.message ?? null)
    setOutput(null)
    setRunError(null)
    setTruncationNotice(null)
    setPassed(null)
    setExecutionState('idle')
    if (resolved.profile === 'web') {
      setPreviewDocument(resolved.target ? buildSrcdoc(nextFiles, resolved.target) : '')
      setPreviewDirty(false)
    } else {
      setPreviewDocument('')
      setPreviewDirty(false)
    }
    setInitialized(true)
  }, [defaultEntrypoint, defaultFiles, entrypoint, files, initialized, language, runtimeProfile])

  useEffect(() => {
    if (fileTreeToggleVisible) {
      return
    }
    setFileTreeOpen(false)
  }, [fileTreeToggleVisible])

  useEffect(() => {
    if (!showPreview || !previewDocument) {
      setPreviewNewTabUrl(null)
      return
    }

    const nextUrl = URL.createObjectURL(new Blob([previewDocument], { type: 'text/html' }))
    setPreviewNewTabUrl(nextUrl)

    return () => {
      URL.revokeObjectURL(nextUrl)
    }
  }, [previewDocument, showPreview])

  useEffect(() => () => {
    abortControllerRef.current?.abort()
  }, [])

  const createItem = () => {
    const baseName = newItemName.trim()
    const basePath = normalizeWorkspacePath(baseName)
    if (!basePath) {
      setPathError('Use a valid path (no leading slash, no "..", and no empty segments).')
      return
    }

    const nextPath = selectedFolder ? normalizeWorkspacePath(`${selectedFolder}/${basePath}`) : basePath
    if (!nextPath) {
      setPathError('Use a valid path for this folder.')
      return
    }

    const hasFileCollision = files.some((file) => file.path === nextPath)
    const hasFolderCollision = directorySet.has(nextPath)

    if (hasFileCollision || hasFolderCollision) {
      setPathError('That path already exists. Choose a different name.')
      return
    }

    if (newItemType === 'folder') {
      setFolders((current) => [...current, nextPath])
      setSelectedFolder(nextPath)
    } else {
      const folderSegments = nextPath.split('/').slice(0, -1)
      const parentFolders = folderSegments.map((_, index) =>
        folderSegments.slice(0, index + 1).join('/'),
      )
      setFolders((current) => Array.from(new Set([...current, ...parentFolders])))
      const nextFiles = [
        ...files,
        { path: nextPath, language: langForFile(nextPath, language), content: '' },
      ]
      setActivePath(nextPath)
      applyWorkspace(nextFiles, entrypoint)
    }

    setPathError(null)
    setShowCreator(false)
    setNewItemName('')
  }

  const removePath = (targetPath: string, isFolder: boolean) => {
    if (readOnly) {
      return
    }

    const confirmMessage = isFolder
      ? `Delete folder "${targetPath}" and all nested files?`
      : `Delete file "${targetPath}"?`

    if (!window.confirm(confirmMessage)) {
      return
    }

    if (isFolder) {
      const prefix = `${targetPath}/`
      const nextFiles = files.filter((file) => !(file.path === targetPath || file.path.startsWith(prefix)))
      const nextFolders = folders.filter((folder) => !(folder === targetPath || folder.startsWith(prefix)))
      if (nextFiles.length === 0) {
        setPathError('Project workspace must keep at least one file.')
        return
      }
      setFolders(nextFolders)
      if (activePath === targetPath || activePath.startsWith(prefix)) {
        setActivePath(nextFiles[0].path)
      }
      applyWorkspace(nextFiles, entrypoint)
      return
    }

    if (files.length <= 1) {
      setPathError('Project workspace must keep at least one file.')
      return
    }

    const nextFiles = files.filter((file) => file.path !== targetPath)
    if (activePath === targetPath) {
      setActivePath(nextFiles[0].path)
    }
    applyWorkspace(nextFiles, entrypoint)
  }

  const beginRename = (targetPath: string) => {
    setRenameTarget(targetPath)
    setRenameValue(getLeafLabel(targetPath))
    setPathError(null)
  }

  const applyRename = () => {
    if (!renameTarget) {
      return
    }

    const renamedLeaf = normalizeWorkspacePath(renameValue)
    if (!renamedLeaf || renamedLeaf.includes('/')) {
      setPathError('Rename value must be a single valid file or folder name.')
      return
    }

    const parent = getParentFolder(renameTarget)
    const nextPath = parent ? `${parent}/${renamedLeaf}` : renamedLeaf

    if (nextPath === renameTarget) {
      setRenameTarget(null)
      return
    }

    if (files.some((file) => file.path === nextPath) || directorySet.has(nextPath)) {
      setPathError('Cannot rename because the destination path already exists.')
      return
    }

    const prefix = `${renameTarget}/`
    const isFolder = directorySet.has(renameTarget)

    if (isFolder) {
      const nextFolders = folders.map((folder) =>
        folder === renameTarget
          ? nextPath
          : folder.startsWith(prefix)
            ? `${nextPath}/${folder.slice(prefix.length)}`
            : folder,
      )
      setFolders(nextFolders)
      const nextFiles = files.map((file) =>
        file.path.startsWith(prefix)
          ? { ...file, path: `${nextPath}/${file.path.slice(prefix.length)}` }
          : file,
      )
      if (activePath.startsWith(prefix)) {
        setActivePath(`${nextPath}/${activePath.slice(prefix.length)}`)
      }
      if (selectedFolder.startsWith(prefix) || selectedFolder === renameTarget) {
        setSelectedFolder(nextPath)
      }
      const nextEntrypoint =
        entrypoint === renameTarget
          ? nextPath
          : entrypoint?.startsWith(prefix)
            ? `${nextPath}/${entrypoint.slice(prefix.length)}`
            : entrypoint
      applyWorkspace(nextFiles, nextEntrypoint)
    } else {
      const nextFiles = files.map((file) =>
        file.path === renameTarget ? { ...file, path: nextPath } : file,
      )
      if (activePath === renameTarget) {
        setActivePath(nextPath)
      }
      applyWorkspace(nextFiles, entrypoint === renameTarget ? nextPath : entrypoint)
    }

    setRenameTarget(null)
    setPathError(null)
  }

  const handleRun = async () => {
    if (!executeUrl || executionControls.runDisabled || abortControllerRef.current) {
      return
    }

    const resolvedTarget = resolveRuntimeTarget({
      language,
      files,
      requestedEntrypoint: entrypoint,
      runtimeProfile,
    })
    if (!resolvedTarget.target) {
      setExecutionState('idle')
      setRunError(resolvedTarget.error?.message ?? 'Select a valid run target before executing.')
      setOutput(null)
      setPassed(null)
      setTruncationNotice(null)
      return
    }

    if (preflightWarning) {
      setExecutionState('idle')
      setRunError(preflightWarning)
      setOutput(null)
      setPassed(null)
      setTruncationNotice(null)
      return
    }

    const abortController = new AbortController()
    const executionToken = executionTokenRef.current + 1
    executionTokenRef.current = executionToken
    abortControllerRef.current = abortController
    setExecutionState('running')
    setRunError(null)
    setTruncationNotice(null)
    setOutput(null)
    setPassed(null)

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (userId) {
        headers['x-user-id'] = userId
      }

      const response = await fetch(executeUrl, {
        method: 'POST',
        headers,
        signal: abortController.signal,
        body: JSON.stringify({
          language,
          files,
          entrypoint: resolvedTarget.target,
          stdin,
          courseId,
        }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ExecuteErrorResponse
        throw new Error(getExecuteErrorMessage(body, response.status))
      }

      const result = (await response.json()) as ExecuteResult
      const stdoutText = result.stdout?.trim() ?? ''
      const stderrText = result.stderr?.trim() ?? ''
      const compileText = result.compile_output?.trim() ?? ''

      if (executionToken !== executionTokenRef.current) {
        return
      }

      let displayOutput = stdoutText
      if (compileText) {
        displayOutput = `[Compile error]\n${compileText}`
      } else if (stderrText) {
        displayOutput = `${stdoutText}\n[Error]\n${stderrText}`.trim()
      }

      setOutput(displayOutput || `(${result.status.description} — no output)`)
      if (result.truncation) {
        const truncatedFieldLimits: string[] = []
        if (result.truncation.stdout.truncated) {
          truncatedFieldLimits.push(`stdout (${result.truncation.stdout.maxSizeBytes} bytes)`)
        }
        if (result.truncation.stderr.truncated) {
          truncatedFieldLimits.push(`stderr (${result.truncation.stderr.maxSizeBytes} bytes)`)
        }
        if (result.truncation.compile_output.truncated) {
          truncatedFieldLimits.push(
            `compile output (${result.truncation.compile_output.maxSizeBytes} bytes)`,
          )
        }
        if (truncatedFieldLimits.length > 0) {
          setTruncationNotice(`Output truncated for ${truncatedFieldLimits.join(', ')}.`)
        }
      }

      if (expectedOutput) {
        setPassed(stdoutText === expectedOutput.trim())
      }
      setExecutionState('completed')
    } catch (error) {
      if (executionToken !== executionTokenRef.current) {
        return
      }
      if (error instanceof Error && error.name === 'AbortError') {
        setExecutionState('idle')
        setOutput(
          (current) =>
            current
            ?? 'Stopped waiting for this run. Backend execution may continue until its normal timeout.',
        )
        return
      }
      setExecutionState('error')
      setRunError(error instanceof Error ? error.message : 'Run failed')
    } finally {
      if (executionToken === executionTokenRef.current && abortControllerRef.current === abortController) {
        abortControllerRef.current = null
      }
    }
  }

  const handleStop = () => {
    if (!abortControllerRef.current || executionControls.stopDisabled) {
      return
    }
    setExecutionState('stopping')
    abortControllerRef.current.abort()
  }

  const treeRows = useMemo(() => {
    const folderRows = sortedFolders.map((path) => ({ path, type: 'folder' as const }))
    const fileRows = sortedFiles.map((file) => ({ path: file.path, type: 'file' as const }))
    return [...folderRows, ...fileRows].sort((left, right) => left.path.localeCompare(right.path))
  }, [sortedFiles, sortedFolders])

  const renderTreePanel = (isDrawer: boolean) => (
    <div
      className={`flex h-full w-72 shrink-0 flex-col border border-slate-200 bg-slate-900 text-slate-100 ${isDrawer ? '' : 'rounded-xl'}`}
    >
      <div className="border-b border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        File tree
      </div>
      <div className="flex-1 overflow-auto px-2 py-2" role="listbox" aria-label="Project files">
        {treeRows.map((row) => {
          const depth = Math.max(0, row.path.split('/').length - 1)
          const selected = row.type === 'file' ? activePath === row.path : selectedFolder === row.path
          const isEntrypoint = row.type === 'file' && row.path === entrypoint
          return (
            <div
              key={`${row.type}:${row.path}`}
              role="option"
              aria-selected={selected}
              className={`mb-1 flex items-center gap-1 rounded px-2 py-1 text-xs ${selected ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              style={{ paddingLeft: `${8 + depth * 10}px` }}
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left"
                onClick={() => {
                  if (row.type === 'file') {
                    setActivePath(row.path)
                  } else {
                    setSelectedFolder(row.path)
                  }
                }}
              >
                {row.type === 'folder' ? '📁' : isEntrypoint ? '🚀' : '📄'} {getLeafLabel(row.path)}
              </button>
              {!readOnly && (
                <>
                  <button
                    type="button"
                    className="text-slate-500 hover:text-indigo-300"
                    onClick={() => beginRename(row.path)}
                    aria-label={`Rename ${row.path}`}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="text-slate-500 hover:text-rose-400"
                    onClick={() => removePath(row.path, row.type === 'folder')}
                    aria-label={`Delete ${row.path}`}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
      {!readOnly && (
        <div className="space-y-2 border-t border-slate-700 p-2">
          {!showCreator ? (
            <div className="flex gap-2">
              <button
                type="button"
                aria-pressed={showCreator && newItemType === 'file'}
                className="flex-1 rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
                onClick={() => {
                  setShowCreator(true)
                  setNewItemType('file')
                }}
              >
                + New File
              </button>
              <button
                type="button"
                aria-pressed={showCreator && newItemType === 'folder'}
                className="flex-1 rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
                onClick={() => {
                  setShowCreator(true)
                  setNewItemType('folder')
                }}
              >
                + New Folder
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400" aria-live="polite">
                Creating a new {newItemType}
              </p>
              <label className="block text-[11px] text-slate-400">
                Create in {selectedFolder || 'project root'}
              </label>
              <input
                autoFocus
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                placeholder={
                  newItemType === 'folder'
                    ? 'folder name or nested/path'
                    : 'filename.ext or nested/path'
                }
                value={newItemName}
                onChange={(event) => setNewItemName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') createItem()
                  if (event.key === 'Escape') {
                    setShowCreator(false)
                    setNewItemName('')
                    setPathError(null)
                  }
                }}
              />
              <div className="flex items-center gap-2">
                <button
                  className="rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700"
                  onClick={createItem}
                >
                  Create
                </button>
                <button
                  className="text-xs text-slate-400 hover:text-slate-200"
                  onClick={() => {
                    setShowCreator(false)
                    setNewItemName('')
                    setPathError(null)
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex min-w-0 flex-col gap-2 overflow-hidden">
      {showExecution && showStdinField && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Program input (stdin)</label>
          <textarea
            className="h-20 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
            placeholder="Optional input to send to the program"
            value={stdin}
            onChange={(event) => onStdinChange?.(event.target.value)}
            readOnly={readOnly}
          />
        </div>
      )}

      <ProjectWorkspaceToolbar
        executionState={executionState}
        fileTreeControl={
          fileTreeToggleVisible ? (
            <button
              className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
              onClick={() => setFileTreeOpen((open) => !open)}
              aria-expanded={fileTreeOpen}
              aria-controls={fileTreeId}
            >
              {fileTreeOpen ? 'Hide file tree' : 'Show file tree'}
            </button>
          ) : undefined
        }
        leftStatus={activeFile?.path ?? 'No file selected'}
        onPreviewRefresh={() => refreshPreview()}
        onRun={handleRun}
        onStop={handleStop}
        onTargetChange={(nextEntrypoint) => {
          applyWorkspace(files, nextEntrypoint, { normalizeFiles: false })
        }}
        previewDirty={previewDirty}
        previewNewTabUrl={previewNewTabUrl}
        runtimeProfile={resolvedRuntimeProfile}
        runDisabled={executionControls.runDisabled}
        selectedTarget={runtimeTarget.target}
        stepDisabled={executionControls.stepDisabled}
        stepCapability={stepCapability}
        stopDisabled={executionControls.stopDisabled}
        targetEditable={entrypointEditable && !readOnly}
        targetOptions={runtimeTarget.targetOptions}
        targetSelectId={targetSelectId}
      />
      {showExecution && passed !== null && (
        <div className="flex justify-end">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {passed ? '✓ Matches' : '✗ No match'}
          </span>
        </div>
      )}

      {(pathError || entrypointError || runError || truncationNotice || preflightWarning || stopHelpText) && (
        <div className="space-y-2">
          {(pathError || entrypointError) && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {pathError ?? entrypointError}
            </p>
          )}
          {runError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{runError}</p>
          )}
          {!runError && preflightWarning && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {preflightWarning}
            </p>
          )}
          {truncationNotice && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {truncationNotice}
            </p>
          )}
          {stopHelpText && (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
              {stopHelpText}
            </p>
          )}
        </div>
      )}

      {renameTarget && !readOnly && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
          <span>Rename {renameTarget} to</span>
          <input
            autoFocus
            className="rounded border border-indigo-200 bg-white px-2 py-1 text-xs text-slate-700"
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applyRename()
              if (event.key === 'Escape') setRenameTarget(null)
            }}
          />
          <button className="rounded bg-indigo-600 px-2 py-1 text-white hover:bg-indigo-700" onClick={applyRename}>
            Apply
          </button>
          <button className="text-indigo-700 hover:underline" onClick={() => setRenameTarget(null)}>
            Cancel
          </button>
        </div>
      )}

      <div className="relative flex min-w-0 gap-3 overflow-hidden" style={{ height }}>
        {showFileTree && (
          <div id={fileTreeId} className="hidden md:block">
            {renderTreePanel(false)}
          </div>
        )}

        {showFileTree && (
          <div className="absolute inset-0 z-20 md:hidden" role="dialog" aria-label="Project file tree">
            <button
              className="absolute inset-0 bg-slate-950/40"
              onClick={() => setFileTreeOpen(false)}
              aria-label="Close file tree"
            />
            <div className="relative h-full max-w-[80%]">{renderTreePanel(true)}</div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 gap-3 overflow-hidden">
          <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200">
            <EditorComponent
              height={height}
              language={activeFile?.language ?? langForFile(activeFile?.path ?? '', language)}
              value={activeFile?.content ?? ''}
              onChange={(value) => {
                if (!activeFile) {
                  return
                }
                const nextFiles = files.map((file) =>
                  file.path === activeFile.path ? { ...file, content: value ?? '' } : file,
                )
                applyWorkspace(nextFiles, entrypoint, { normalizeFiles: false })
              }}
              theme="vs-dark"
              options={{
                readOnly,
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>

          {(showPreview || showExecution) && (
            <div className="flex min-w-0 w-[42%] max-w-[48%] flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {showPreview ? 'Preview' : 'Output'}
              </p>
              {showPreview ? (
                <>
                  <p className="text-xs text-slate-500">
                    Refresh preview when you want to apply the latest workspace changes.
                  </p>
                  <iframe
                    title="Project preview"
                    srcDoc={previewDocument}
                    sandbox="allow-scripts"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white"
                  />
                </>
              ) : (
                <div className="flex-1 rounded-xl border border-slate-200 bg-slate-900 px-4 py-3">
                  {output !== null ? (
                    <pre className="whitespace-pre-wrap font-mono text-xs text-slate-100">{output}</pre>
                  ) : (
                    <p className="text-xs text-slate-500">Run your code to see output here.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
