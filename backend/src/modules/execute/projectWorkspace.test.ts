import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeProjectWorkspaceFiles,
  normalizeWorkspacePath,
  resolveWorkspaceEntrypoint,
} from './projectWorkspace.js'

test('normalizeWorkspacePath rejects traversal segments', () => {
  assert.equal(normalizeWorkspacePath('../app.py'), null)
  assert.equal(normalizeWorkspacePath('/index.html'), null)
  assert.equal(normalizeWorkspacePath('src//index.html'), 'src/index.html')
})

test('normalizeProjectWorkspaceFiles catches collisions', () => {
  const normalized = normalizeProjectWorkspaceFiles([
    { path: 'src/index.html', content: 'a' },
    { path: 'src/index.html', content: 'b' },
  ])
  assert.equal(normalized.files, null)
  assert.equal(normalized.errorCode, 'FILE_PATH_INVALID')
})

test('resolveWorkspaceEntrypoint picks deterministic default and validates explicit value', () => {
  const files = [
    { path: 'index.html', content: '<html></html>' },
    { path: 'style.css', content: '' },
  ]
  const resolvedDefault = resolveWorkspaceEntrypoint({ language: 'web', files })
  assert.equal(resolvedDefault.entrypoint, 'index.html')

  const invalid = resolveWorkspaceEntrypoint({
    language: 'web',
    files,
    requestedEntrypoint: 'missing.html',
  })
  assert.equal(invalid.errorCode, 'ENTRYPOINT_INVALID')
})

