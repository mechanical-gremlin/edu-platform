import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { act, create } from 'react-test-renderer'
import { ProjectWorkspaceToolbar } from '../src/components/coding/ProjectWorkspaceToolbar.tsx'
import { ProjectWorkspaceEditor } from '../src/components/coding/ProjectWorkspaceEditor.tsx'
import {
  getExecutionControlState,
  getStepCapability,
  resolveRuntimeProfile,
  resolveRuntimeTarget,
} from '../src/utils/runtimeProfiles.ts'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

test('code profile toolbar renders target, run, step, and stop in order', () => {
  const html = renderToStaticMarkup(
    <ProjectWorkspaceToolbar
      executionState="idle"
      leftStatus="src/index.ts"
      runtimeProfile="code"
      runDisabled={false}
      selectedTarget="src/index.ts"
      stepDisabled
      stepCapability={getStepCapability({ language: 'typescript', runtimeProfile: 'code' })}
      stopDisabled
      targetEditable
      targetOptions={['src/index.ts']}
      targetSelectId="code-target"
    />,
  )

  assert.match(html, /Target file: src\/index\.ts/)
  assert.ok(html.indexOf('▶ Run') < html.indexOf('↷ Step'))
  assert.ok(html.indexOf('↷ Step') < html.indexOf('■ Stop'))
  assert.ok(!html.includes('Refresh Preview'))
})

test('web profile toolbar renders preview controls and excludes step', () => {
  const html = renderToStaticMarkup(
    <ProjectWorkspaceToolbar
      executionState="idle"
      leftStatus="index.html"
      previewDirty
      previewNewTabUrl="blob:test"
      runtimeProfile="web"
      runDisabled={false}
      selectedTarget="index.html"
      stepDisabled
      stepCapability={getStepCapability({ language: 'javascript', runtimeProfile: 'web' })}
      stopDisabled
      targetEditable
      targetOptions={['index.html']}
      targetSelectId="web-target"
    />,
  )

  assert.match(html, /Target page: index\.html/)
  assert.match(html, /Refresh Preview \*/)
  assert.match(html, /Open Preview Tab/)
  assert.ok(!html.includes('↷ Step'))
  assert.ok(!html.includes('■ Stop'))
})

test('runtime profile routing distinguishes javascript code from javascript web workspaces', () => {
  assert.equal(
    resolveRuntimeProfile({
      language: 'javascript',
      files: [{ path: 'index.js', language: 'javascript', content: 'console.log("hi")' }],
    }),
    'code',
  )
  assert.equal(
    resolveRuntimeProfile({
      language: 'javascript',
      files: [
        { path: 'index.html', language: 'html', content: '<!DOCTYPE html>' },
        { path: 'script.js', language: 'javascript', content: 'console.log("hi")' },
      ],
      requestedEntrypoint: 'index.html',
    }),
    'web',
  )
})

test('execution control gating disables run while active, enables stop only while active, and blocks unsupported step', () => {
  const stepCapability = getStepCapability({ language: 'python', runtimeProfile: 'code' })
  const runningControls = getExecutionControlState({
    executionState: 'running',
    hasValidTarget: true,
    stepCapability,
  })
  const idleControls = getExecutionControlState({
    executionState: 'idle',
    hasValidTarget: true,
    stepCapability,
  })
  const stoppingControls = getExecutionControlState({
    executionState: 'stopping',
    hasValidTarget: true,
    stepCapability,
  })

  assert.equal(runningControls.runDisabled, true)
  assert.equal(runningControls.stopDisabled, false)
  assert.equal(idleControls.stopDisabled, true)
  assert.equal(idleControls.stepDisabled, true)
  assert.equal(stoppingControls.stopDisabled, true)
})

test('target validation reports actionable errors and still resolves deterministic defaults', () => {
  const invalidTarget = resolveRuntimeTarget({
    language: 'javascript',
    files: [
      { path: 'index.js', language: 'javascript', content: 'console.log("hi")' },
      { path: 'styles.css', language: 'css', content: 'body {}' },
    ],
    requestedEntrypoint: 'styles.css',
  })
  const missingRunnableTarget = resolveRuntimeTarget({
    language: 'javascript',
    files: [{ path: 'README.md', language: 'markdown', content: '# Notes' }],
  })
  const deterministicDefault = resolveRuntimeTarget({
    language: 'javascript',
    files: [
      { path: 'notes.txt', language: 'text', content: 'ignore' },
      { path: 'index.js', language: 'javascript', content: 'console.log("hi")' },
    ],
  })

  assert.match(invalidTarget.error?.message ?? '', /not runnable/i)
  assert.match(missingRunnableTarget.error?.message ?? '', /Add a runnable JavaScript file/i)
  assert.equal(deterministicDefault.target, 'index.js')
})

test('code profile smoke test keeps deterministic executable target selection for existing run flows', () => {
  const resolved = resolveRuntimeTarget({
    language: 'python',
    files: [{ path: 'main.py', language: 'python', content: 'print("ok")' }],
  })

  assert.equal(resolved.profile, 'code')
  assert.equal(resolved.target, 'main.py')
  assert.equal(resolved.error, null)
})

test('workspace editor updates the selected target and stop aborts the active run request', async () => {
  const originalFetch = globalThis.fetch
  const fetchBodies: Array<{ entrypoint: string | null }> = []
  globalThis.fetch = ((_, init) => new Promise((resolve, reject) => {
    const payload = JSON.parse(String(init?.body ?? '{}')) as { entrypoint: string | null }
    fetchBodies.push(payload)
    init?.signal?.addEventListener('abort', () => {
      reject(new DOMException('Aborted', 'AbortError'))
    })
    if (!init?.signal) {
      resolve({
        ok: true,
        json: async () => ({
          stdout: 'ok',
          stderr: null,
          compile_output: null,
          status: { id: 3, description: 'Accepted' },
        }),
      } as Response)
    }
  })) as typeof fetch

  const StubEditor = ({
    value,
  }: {
    height?: string
    language?: string
    onChange?: (value: string | undefined) => void
    options?: object
    theme?: string
    value?: string
  }) => <textarea readOnly value={value ?? ''} />

  let renderer: ReturnType<typeof create>
  await act(async () => {
    renderer = create(
      <ProjectWorkspaceEditor
        language="javascript"
        runtimeProfile="code"
        defaultFiles={[
          { path: 'index.js', language: 'javascript', content: 'console.log("one")' },
          { path: 'alt.js', language: 'javascript', content: 'console.log("two")' },
        ]}
        defaultEntrypoint="index.js"
        executeUrl="/execute"
        editorComponent={StubEditor}
      />,
    )
  })

  try {
    const select = renderer!.root.findByProps({ 'aria-label': 'Target file' })
    await act(async () => {
      select.props.onChange({ target: { value: 'alt.js' } })
    })

    const runButton = renderer!.root.findAllByType('button').find((button) => button.props.children === '▶ Run')
    assert.ok(runButton)

    await act(async () => {
      runButton?.props.onClick()
      await Promise.resolve()
    })

    assert.equal(fetchBodies.at(-1)?.entrypoint, 'alt.js')

    const stopButton = renderer!.root.findAllByType('button').find((button) => {
      const label = button.props.children
      return label === '■ Stop' || label === '■ Stopping…'
    })
    assert.equal(stopButton?.props.disabled, false)

    await act(async () => {
      stopButton?.props.onClick()
      await Promise.resolve()
    })

    const renderedText = JSON.stringify(renderer!.toJSON())
    assert.match(renderedText, /Stopped waiting for this run/)
  } finally {
    await act(async () => {
      renderer!.unmount()
    })
    globalThis.fetch = originalFetch
  }
})
