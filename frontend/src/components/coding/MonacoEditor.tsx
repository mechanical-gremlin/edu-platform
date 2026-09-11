import { useEffect, useRef, useState } from 'react'
import MonacoEditorReact from '@monaco-editor/react'

export const CODING_LANGUAGES: { value: string; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'html', label: 'HTML' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
]

// Maps our language keys to Monaco's language IDs (mostly the same, a few differ)
const MONACO_LANGUAGE_MAP: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  csharp: 'csharp',
  html: 'html',
  php: 'php',
  ruby: 'ruby',
  go: 'go',
  rust: 'rust',
  swift: 'swift',
  kotlin: 'kotlin',
}

interface ExecuteResult {
  stdout: string | null
  stderr: string | null
  compile_output: string | null
  status: { id: number; description: string }
  time: string | null
  memory: number | null
}

interface MonacoEditorProps {
  /** Initial code value. Changing this prop resets the editor only on first mount. */
  defaultValue?: string
  /** Controlled language selection */
  language: string
  /** Whether to show the language selector */
  showLanguageSelector?: boolean
  onLanguageChange?: (language: string) => void
  onChange?: (code: string) => void
  /** When truthy, show a Run button that calls this endpoint */
  executeUrl?: string
  /** x-user-id to pass to the execute endpoint */
  userId?: string
  /** Expected output for automatic pass/fail feedback */
  expectedOutput?: string | null
  readOnly?: boolean
  minHeight?: string
}

export const MonacoEditor = ({
  defaultValue = '',
  language,
  showLanguageSelector = false,
  onLanguageChange,
  onChange,
  executeUrl,
  userId,
  expectedOutput,
  readOnly = false,
  minHeight = '400px',
}: MonacoEditorProps) => {
  const [code, setCode] = useState(defaultValue)
  const [output, setOutput] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [passed, setPassed] = useState<boolean | null>(null)
  const initialCodeRef = useRef(defaultValue)

  // Only reset editor content when the starterCode prop itself changes (new activity)
  useEffect(() => {
    if (defaultValue !== initialCodeRef.current) {
      initialCodeRef.current = defaultValue
      setCode(defaultValue)
      setOutput(null)
      setRunError(null)
      setPassed(null)
    }
  }, [defaultValue])

  const handleChange = (value: string | undefined) => {
    const next = value ?? ''
    setCode(next)
    onChange?.(next)
  }

  const handleRun = async () => {
    if (!executeUrl) return
    setRunning(true)
    setRunError(null)
    setOutput(null)
    setPassed(null)

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (userId) headers['x-user-id'] = userId

      const response = await fetch(executeUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ language, code }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string }
        throw new Error(body.message ?? `HTTP ${response.status}`)
      }

      const result = (await response.json()) as ExecuteResult
      const stdoutText = result.stdout?.trim() ?? ''
      const stderrText = result.stderr?.trim() ?? ''
      const compileText = result.compile_output?.trim() ?? ''

      let displayOutput = stdoutText
      if (compileText) displayOutput = `[Compile error]\n${compileText}`
      else if (stderrText) displayOutput = `${stdoutText}\n[Error]\n${stderrText}`.trim()

      setOutput(displayOutput || `(${result.status.description} — no output)`)

      if (expectedOutput) {
        setPassed(stdoutText === expectedOutput.trim())
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Run failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {showLanguageSelector && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Language</label>
          <select
            className="rounded border border-slate-200 px-2 py-1 text-sm"
            value={language}
            onChange={(e) => onLanguageChange?.(e.target.value)}
          >
            {CODING_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ minHeight }} className="overflow-hidden rounded-xl border border-slate-200">
        <MonacoEditorReact
          height={minHeight}
          language={MONACO_LANGUAGE_MAP[language] ?? language}
          value={code}
          onChange={handleChange}
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

      {executeUrl && (
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            disabled={running || !code.trim()}
            onClick={handleRun}
          >
            {running ? '▶ Running…' : '▶ Run'}
          </button>
          {passed !== null && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                passed
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {passed ? '✓ Output matches expected' : '✗ Output does not match expected'}
            </span>
          )}
        </div>
      )}

      {runError && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{runError}</p>
      )}

      {output !== null && (
        <div className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Output</p>
          <pre className="whitespace-pre-wrap font-mono text-xs text-slate-100">{output}</pre>
        </div>
      )}
    </div>
  )
}
