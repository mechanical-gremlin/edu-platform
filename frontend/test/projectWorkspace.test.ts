import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDefaultWorkspaceFiles,
  buildDefaultWorkspaceState,
  getDefaultWorkspaceEntrypoint,
  isPreviewRuntimeLanguage,
  resolveDeterministicEntrypoint,
} from '../src/utils/projectWorkspace.ts'

test('workspace defaults provide deterministic entrypoints for non-web runtimes', () => {
  const pythonFiles = buildDefaultWorkspaceFiles('python')
  const javascriptFiles = buildDefaultWorkspaceFiles('javascript')

  assert.equal(getDefaultWorkspaceEntrypoint('python'), 'main.py')
  assert.equal(getDefaultWorkspaceEntrypoint('javascript'), 'index.js')
  assert.equal(
    resolveDeterministicEntrypoint({ language: 'python', files: pythonFiles }).entrypoint,
    'main.py',
  )
  assert.equal(
    resolveDeterministicEntrypoint({ language: 'javascript', files: javascriptFiles }).entrypoint,
    'index.js',
  )
})

test('workspace defaults keep the web kit as a preview-oriented preset', () => {
  const webFiles = buildDefaultWorkspaceFiles('web')

  assert.equal(isPreviewRuntimeLanguage('web'), true)
  assert.equal(isPreviewRuntimeLanguage('html'), true)
  assert.equal(isPreviewRuntimeLanguage('python'), false)
  assert.deepEqual(
    webFiles.map((file) => file.path),
    ['index.html', 'style.css', 'script.js'],
  )
})

test('default workspace state resets files and entrypoint when switching runtimes', () => {
  const pythonWorkspace = buildDefaultWorkspaceState('python')
  const javascriptWorkspace = buildDefaultWorkspaceState('javascript')

  assert.equal(pythonWorkspace.entrypoint, 'main.py')
  assert.equal(javascriptWorkspace.entrypoint, 'index.js')
  assert.deepEqual(
    pythonWorkspace.files.map((file) => file.path),
    ['main.py'],
  )
  assert.deepEqual(
    javascriptWorkspace.files.map((file) => file.path),
    ['index.js'],
  )
})
