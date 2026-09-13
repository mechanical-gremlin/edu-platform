import { useEffect, useId, useMemo, useRef, useState } from 'react'
import MonacoEditorReact from '@monaco-editor/react'
import type { StarterFile } from '../../types/models'
import {
  normalizeProjectWorkspaceFiles,
  normalizeWorkspacePath,
  resolveDeterministicEntrypoint,
} from '../../utils/projectWorkspace'

const DEFAULT_FILES: StarterFile[] = [
  { path: 'index.html', language: 'html', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>My Page</title>\n  <link rel="stylesheet" href="style.css" />\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <script src="script.js"></script>\n</body>\n</html>' },
  { path: 'style.css', language: 'css', content: 'body {\n  font-family: sans-serif;\n  margin: 2rem;\n  background: #f9f9f9;\n}\n\nh1 {\n  color: #4f46e5;\n}' },
  { path: 'script.js', language: 'javascript', content: '// Your JavaScript goes here\nconsole.log("Hello from script.js");' },
]

const EXT_LANGUAGE: Record<string, string> = {
  html: 'html',
  css: 'css',
  js: 'javascript',
  ts: 'typescript',
  json: 'json',
  md: 'markdown',
}

function langForFile(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return EXT_LANGUAGE[ext] ?? 'plaintext'
}

function buildSrcdoc(files: StarterFile[], entrypoint: string): string {
  const htmlFile = files.find((file) => file.path === entrypoint) ?? files.find((file) => file.path.endsWith('.html'))
  const cssList = files.filter((file) => file.path.endsWith('.css'))
  const jsList = files.filter((file) => file.path.endsWith('.js'))

  const cssBlocks = cssList.map((file) => `<style>/* ${file.path} */\n${file.content}\n</style>`).join('\n')
  const jsBlocks = jsList.map((file) => `<script>\n${file.content}\n</script>`).join('\n')

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

interface WebProjectEditorProps {
  defaultFiles?: StarterFile[] | null
  defaultEntrypoint?: string | null
  onChange?: (files: StarterFile[], entrypoint: string | null) => void
  readOnly?: boolean
  entrypointEditable?: boolean
  height?: string
}

export const WebProjectEditor = ({
  defaultFiles,
  defaultEntrypoint,
  onChange,
  readOnly = false,
  entrypointEditable = true,
  height = '500px',
}: WebProjectEditorProps) => {
  const initialFilesRef = useRef<StarterFile[]>(
    defaultFiles && defaultFiles.length > 0 ? normalizeProjectWorkspaceFiles(defaultFiles) : DEFAULT_FILES,
  )
  const [files, setFiles] = useState<StarterFile[]>(initialFilesRef.current)
  const [activePath, setActivePath] = useState(initialFilesRef.current[0]?.path ?? 'index.html')
  const [fileTreeOpen, setFileTreeOpen] = useState(false)
  const [folders, setFolders] = useState<string[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemType, setNewItemType] = useState<'file' | 'folder'>('file')
  const [showCreator, setShowCreator] = useState(false)
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [entrypoint, setEntrypoint] = useState<string | null>(defaultEntrypoint ?? initialFilesRef.current[0]?.path ?? null)
  const [entrypointError, setEntrypointError] = useState<string | null>(null)
  const [pathError, setPathError] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [srcdoc, setSrcdoc] = useState('')
  const [initialized, setInitialized] = useState(false)
  const prevDefaultsRef = useRef<{ files: StarterFile[] | null | undefined; entrypoint: string | null | undefined }>({
    files: undefined,
    entrypoint: undefined,
  })
  const fileTreeId = useId()

  const directorySet = useMemo(() => {
    const computed = getDirectoryPaths(files)
    for (const folder of folders) {
      computed.add(folder)
    }
    return computed
  }, [files, folders])

  const sortedFolders = useMemo(() => Array.from(directorySet).sort((left, right) => left.localeCompare(right)), [directorySet])
  const sortedFiles = useMemo(() => [...files].sort((left, right) => left.path.localeCompare(right.path)), [files])

  const refreshPreview = (nextFiles: StarterFile[], nextEntrypoint: string | null) => {
    if (!nextEntrypoint) {
      setSrcdoc('')
      return
    }
    setSrcdoc(buildSrcdoc(nextFiles, nextEntrypoint))
    setPreviewKey((value) => value + 1)
  }

  const publish = (nextFiles: StarterFile[], requestedEntrypoint: string | null) => {
    const resolved = resolveDeterministicEntrypoint({
      language: 'web',
      files: nextFiles,
      requestedEntrypoint,
    })

    setFiles(nextFiles)
    setEntrypoint(resolved.entrypoint)
    setEntrypointError(resolved.error?.message ?? null)
    onChange?.(nextFiles, resolved.entrypoint)
    refreshPreview(nextFiles, resolved.entrypoint)
  }

  useEffect(() => {
    if (!initialized || defaultFiles !== prevDefaultsRef.current.files || defaultEntrypoint !== prevDefaultsRef.current.entrypoint) {
      prevDefaultsRef.current = { files: defaultFiles, entrypoint: defaultEntrypoint }
      const nextFiles = defaultFiles && defaultFiles.length > 0 ? normalizeProjectWorkspaceFiles(defaultFiles) : DEFAULT_FILES
      const resolved = resolveDeterministicEntrypoint({
        language: 'web',
        files: nextFiles,
        requestedEntrypoint: defaultEntrypoint,
      })
      setFiles(nextFiles)
      setFolders([])
      setActivePath(nextFiles[0]?.path ?? 'index.html')
      setEntrypoint(resolved.entrypoint)
      setEntrypointError(resolved.error?.message ?? null)
      refreshPreview(nextFiles, resolved.entrypoint)
      onChange?.(nextFiles, resolved.entrypoint)
      setInitialized(true)
    }
  }, [defaultEntrypoint, defaultFiles, initialized, onChange])

  useEffect(() => {
    if (!srcdoc) {
      const resolved = resolveDeterministicEntrypoint({
        language: 'web',
        files,
        requestedEntrypoint: entrypoint,
      })
      refreshPreview(files, resolved.entrypoint)
      setEntrypoint(resolved.entrypoint)
      setEntrypointError(resolved.error?.message ?? null)
    }
  }, [entrypoint, files, srcdoc])

  const activeFile = files.find((file) => file.path === activePath) ?? files[0] ?? null

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
      const nextFiles = [...files, { path: nextPath, language: langForFile(nextPath), content: '' }]
      setActivePath(nextPath)
      publish(nextFiles, entrypoint)
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
      setFolders(nextFolders)
      if (nextFiles.length === 0) {
        const fallbackFile = { path: 'index.html', language: 'html', content: '<!DOCTYPE html>\n<html></html>' }
        setActivePath(fallbackFile.path)
        publish([fallbackFile], fallbackFile.path)
      } else {
        if (activePath === targetPath || activePath.startsWith(prefix)) {
          setActivePath(nextFiles[0].path)
        }
        publish(nextFiles, entrypoint)
      }
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
    publish(nextFiles, entrypoint)
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

    const isFolder = directorySet.has(renameTarget) && !files.some((file) => file.path === renameTarget)

    if (isFolder) {
      const prefix = `${renameTarget}/`
      const nextFolders = folders.map((folder) =>
        folder === renameTarget ? nextPath : folder.startsWith(prefix) ? `${nextPath}/${folder.slice(prefix.length)}` : folder,
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
      publish(nextFiles, nextEntrypoint)
    } else {
      const nextFiles = files.map((file) => (file.path === renameTarget ? { ...file, path: nextPath } : file))
      if (activePath === renameTarget) {
        setActivePath(nextPath)
      }
      publish(nextFiles, entrypoint === renameTarget ? nextPath : entrypoint)
    }

    setRenameTarget(null)
    setPathError(null)
  }

  const treeRows = useMemo(() => {
    const folderRows = sortedFolders.map((path) => ({ path, type: 'folder' as const }))
    const fileRows = sortedFiles.map((file) => ({ path: file.path, type: 'file' as const }))
    return [...folderRows, ...fileRows].sort((left, right) => left.path.localeCompare(right.path))
  }, [sortedFiles, sortedFolders])

  const renderTreePanel = (isDrawer: boolean) => (
    <div className={`flex h-full w-72 shrink-0 flex-col border border-slate-200 bg-slate-900 text-slate-100 ${isDrawer ? '' : 'rounded-xl'}`}>
      <div className="border-b border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        File tree
      </div>
      <div className="flex-1 overflow-auto px-2 py-2" role="tree" aria-label="Project files">
        {treeRows.map((row) => {
          const depth = Math.max(0, row.path.split('/').length - 1)
          const selected = row.type === 'file' ? activePath === row.path : selectedFolder === row.path
          const isEntrypoint = row.type === 'file' && row.path === entrypoint
          return (
            <div
              key={`${row.type}:${row.path}`}
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
                  <button type="button" className="text-slate-500 hover:text-indigo-300" onClick={() => beginRename(row.path)} aria-label={`Rename ${row.path}`}>
                    ✎
                  </button>
                  <button type="button" className="text-slate-500 hover:text-rose-400" onClick={() => removePath(row.path, row.type === 'folder')} aria-label={`Delete ${row.path}`}>
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
              <button className="flex-1 rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600" onClick={() => { setShowCreator(true); setNewItemType('file') }}>
                + New File
              </button>
              <button className="flex-1 rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600" onClick={() => { setShowCreator(true); setNewItemType('folder') }}>
                + New Folder
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-[11px] text-slate-400">
                Create in {selectedFolder || 'project root'}
              </label>
              <input
                autoFocus
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                placeholder={newItemType === 'folder' ? 'folder name or nested/path' : 'filename.ext or nested/path'}
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
                <button className="rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700" onClick={createItem}>
                  Create
                </button>
                <button className="text-xs text-slate-400 hover:text-slate-200" onClick={() => { setShowCreator(false); setNewItemName(''); setPathError(null) }}>
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
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-800 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
            onClick={() => setFileTreeOpen((open) => !open)}
            aria-expanded={fileTreeOpen}
            aria-controls={fileTreeId}
          >
            {fileTreeOpen ? 'Hide file tree' : 'Show file tree'}
          </button>
          <span className="truncate text-xs text-slate-300">{activeFile?.path ?? 'No file selected'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {entrypointEditable && (
            <select
              className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              value={entrypoint ?? ''}
              onChange={(event) => {
                const nextEntrypoint = event.target.value || null
                const resolved = resolveDeterministicEntrypoint({
                  language: 'web',
                  files,
                  requestedEntrypoint: nextEntrypoint,
                })
                setEntrypoint(resolved.entrypoint)
                setEntrypointError(resolved.error?.message ?? null)
                onChange?.(files, resolved.entrypoint)
                refreshPreview(files, resolved.entrypoint)
              }}
            >
              {sortedFiles.map((file) => (
                <option key={`entrypoint-${file.path}`} value={file.path}>
                  Entrypoint: {file.path}
                </option>
              ))}
            </select>
          )}
          <button className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700" onClick={() => refreshPreview(files, entrypoint)}>
            ▶ Refresh
          </button>
        </div>
      </div>

      {(pathError || entrypointError) && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {pathError ?? entrypointError}
        </p>
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
          <button className="rounded bg-indigo-600 px-2 py-1 text-white hover:bg-indigo-700" onClick={applyRename}>Apply</button>
          <button className="text-indigo-700 hover:underline" onClick={() => setRenameTarget(null)}>Cancel</button>
        </div>
      )}

      <div className="relative flex min-w-0 gap-3 overflow-hidden" style={{ height }}>
        {fileTreeOpen && (
          <div id={fileTreeId} className="hidden md:block">
            {renderTreePanel(false)}
          </div>
        )}

        {fileTreeOpen && (
          <div className="absolute inset-0 z-20 md:hidden" role="dialog" aria-label="Project file tree">
            <button className="absolute inset-0 bg-slate-950/40" onClick={() => setFileTreeOpen(false)} aria-label="Close file tree" />
            <div className="relative h-full max-w-[80%]">
              {renderTreePanel(true)}
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 gap-3 overflow-hidden">
          <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200">
            <MonacoEditorReact
              height={height}
              language={activeFile?.language ?? langForFile(activeFile?.path ?? 'index.html')}
              value={activeFile?.content ?? ''}
              onChange={(value) => {
                if (!activeFile) {
                  return
                }
                const nextFiles = files.map((file) =>
                  file.path === activeFile.path
                    ? { ...file, content: value ?? '' }
                    : file,
                )
                publish(nextFiles, entrypoint)
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

          <div className="flex min-w-0 w-[42%] max-w-[48%] flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
            <iframe
              key={previewKey}
              title="Web project preview"
              srcDoc={srcdoc}
              sandbox="allow-scripts"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
