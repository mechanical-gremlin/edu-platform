import test from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProjectWorkspaceToolbar } from '../src/components/coding/ProjectWorkspaceToolbar.tsx'
import {
  getExecutionControlState,
  getStepCapability,
  resolveRuntimeProfile,
  resolveRuntimeTarget,
} from '../src/utils/runtimeProfiles.ts'

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

  assert.equal(runningControls.runDisabled, true)
  assert.equal(runningControls.stopDisabled, false)
  assert.equal(idleControls.stopDisabled, true)
  assert.equal(idleControls.stepDisabled, true)
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
