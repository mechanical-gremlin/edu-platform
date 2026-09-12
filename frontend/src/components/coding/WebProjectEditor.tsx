import { useEffect, useRef, useState } from 'react'
import MonacoEditorReact from '@monaco-editor/react'
import type { StarterFile } from '../../types/models'

const DEFAULT_FILES: StarterFile[] = [
  { name: 'index.html', language: 'html', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>My Page</title>\n  <link rel="stylesheet" href="style.css" />\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <script src="script.js"></script>\n</body>\n</html>' },
  { name: 'style.css', language: 'css', content: 'body {\n  font-family: sans-serif;\n  margin: 2rem;\n  background: #f9f9f9;\n}\n\nh1 {\n  color: #4f46e5;\n}' },
  { name: 'script.js', language: 'javascript', content: '// Your JavaScript goes here\nconsole.log("Hello from script.js");' },
]

const EXT_LANGUAGE: Record<string, string> = {
  html: 'html',
  css: 'css',
  js: 'javascript',
  ts: 'typescript',
  json: 'json',
  md: 'markdown',
}

function langForFile(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_LANGUAGE[ext] ?? 'plaintext'
}

function buildSrcdoc(files: StarterFile[]): string {
  const htmlFile = files.find((f) => f.name.endsWith('.html'))
  const cssList = files.filter((f) => f.name.endsWith('.css'))
  const jsList = files.filter((f) => f.name.endsWith('.js'))

  const cssBlocks = cssList.map((f) => `<style>/* ${f.name} */\n${f.content}\n</style>`).join('\n')
  const jsBlocks = jsList.map((f) => `<script>\n${f.content}\n</script>`).join('\n')

  // If the student has an HTML file, inject CSS and JS by appending them into a wrapper
  // rather than using regex-based patching, which avoids incomplete sanitization issues.
  // We wrap the HTML content verbatim inside a full document and append style/script blocks.
  if (htmlFile) {
    // Strip any <link rel="stylesheet"> and external <script src="…"> tags
    // using DOMParser so we handle all valid tag forms correctly.
    // Since we're running in the browser, we can use it safely here.
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlFile.content, 'text/html')
    doc.querySelectorAll('link[rel="stylesheet"]').forEach((el) => el.remove())
    doc.querySelectorAll('script[src]').forEach((el) => el.remove())

    // Append inline CSS blocks to <head>
    if (cssBlocks) {
      const wrapper = doc.createElement('template')
      wrapper.innerHTML = cssBlocks
      doc.head.appendChild(wrapper.content)
    }

    // Append inline JS blocks to <body>
    if (jsBlocks) {
      const wrapper = doc.createElement('template')
      wrapper.innerHTML = jsBlocks
      doc.body.appendChild(wrapper.content)
    }

    return doc.documentElement.outerHTML
  }

  // No HTML file — build a minimal document
  return `<!DOCTYPE html><html><head>${cssBlocks}</head><body>${jsBlocks}</body></html>`
}

interface WebProjectEditorProps {
  /** Initial files. If omitted, DEFAULT_FILES are used. */
  defaultFiles?: StarterFile[] | null
  onChange?: (files: StarterFile[]) => void
  readOnly?: boolean
  height?: string
}

export const WebProjectEditor = ({
  defaultFiles,
  onChange,
  readOnly = false,
  height = '500px',
}: WebProjectEditorProps) => {
  // Resolve initial files once at mount time; further prop changes are handled by the useEffect below.
  const initialFilesRef = useRef<StarterFile[]>(
    defaultFiles && defaultFiles.length > 0 ? defaultFiles : DEFAULT_FILES,
  )
  const [files, setFiles] = useState<StarterFile[]>(initialFilesRef.current)
  const [activeIndex, setActiveIndex] = useState(0)
  const [newFileName, setNewFileName] = useState('')
  const [addingFile, setAddingFile] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [srcdoc, setSrcdoc] = useState(() => buildSrcdoc(initialFilesRef.current))
  const prevDefaultRef = useRef(defaultFiles)

  // Reset when defaultFiles prop changes (new activity loaded)
  useEffect(() => {
    if (defaultFiles !== prevDefaultRef.current) {
      prevDefaultRef.current = defaultFiles
      const next = defaultFiles && defaultFiles.length > 0 ? defaultFiles : DEFAULT_FILES
      setFiles(next)
      setActiveIndex(0)
      setSrcdoc(buildSrcdoc(next))
      setPreviewKey((k) => k + 1)
    }
  }, [defaultFiles])

  const updateFiles = (next: StarterFile[]) => {
    setFiles(next)
    onChange?.(next)
  }

  const handleCodeChange = (value: string | undefined) => {
    const next = files.map((f, i) => (i === activeIndex ? { ...f, content: value ?? '' } : f))
    updateFiles(next)
  }

  const refreshPreview = () => {
    setSrcdoc(buildSrcdoc(files))
    setPreviewKey((k) => k + 1)
  }

  const handleAddFile = () => {
    const name = newFileName.trim()
    if (!name) return
    const already = files.some((f) => f.name === name)
    if (already) return
    const lang = langForFile(name)
    const next = [...files, { name, language: lang, content: '' }]
    updateFiles(next)
    setActiveIndex(next.length - 1)
    setNewFileName('')
    setAddingFile(false)
  }

  const handleRemoveFile = (index: number) => {
    if (files.length <= 1) return
    const next = files.filter((_, i) => i !== index)
    updateFiles(next)
    setActiveIndex(Math.min(activeIndex, next.length - 1))
  }

  const active = files[activeIndex] ?? files[0]

  return (
    <div className="flex flex-col gap-2">
      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-t-xl border border-slate-200 bg-slate-800 px-2 pt-2">
        {files.map((f, i) => (
          <div
            key={f.name}
            className={`group flex items-center gap-1 rounded-t px-3 py-1.5 text-xs font-medium cursor-pointer select-none ${
              i === activeIndex
                ? 'bg-slate-900 text-slate-100'
                : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
            onClick={() => setActiveIndex(i)}
          >
            {f.name}
            {!readOnly && files.length > 1 && (
              <button
                className="ml-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveFile(i)
                }}
                aria-label={`Remove ${f.name}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {!readOnly && !addingFile && (
          <button
            className="ml-1 rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            onClick={() => setAddingFile(true)}
          >
            + Add file
          </button>
        )}
        {!readOnly && addingFile && (
          <div className="flex items-center gap-1 px-2 pb-1">
            <input
              autoFocus
              className="rounded border border-slate-500 bg-slate-700 px-2 py-0.5 text-xs text-slate-100 outline-none"
              placeholder="filename.ext"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddFile()
                if (e.key === 'Escape') { setAddingFile(false); setNewFileName('') }
              }}
            />
            <button
              className="rounded bg-indigo-600 px-2 py-0.5 text-xs text-white hover:bg-indigo-700"
              onClick={handleAddFile}
            >
              Add
            </button>
            <button
              className="text-xs text-slate-400 hover:text-slate-200"
              onClick={() => { setAddingFile(false); setNewFileName('') }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Editor + Preview side by side */}
      <div className="flex gap-3" style={{ height }}>
        {/* Code editor */}
        <div className="flex-1 overflow-hidden rounded-b-xl border border-t-0 border-slate-200">
          <MonacoEditorReact
            height={height}
            language={active?.language ?? 'html'}
            value={active?.content ?? ''}
            onChange={handleCodeChange}
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

        {/* Live preview */}
        <div className="flex w-2/5 flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
            <button
              className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
              onClick={refreshPreview}
            >
              ▶ Refresh
            </button>
          </div>
          <iframe
            key={previewKey}
            title="Web project preview"
            srcDoc={srcdoc}
            sandbox="allow-scripts"
            className="flex-1 rounded-xl border border-slate-200 bg-white"
          />
        </div>
      </div>
    </div>
  )
}
