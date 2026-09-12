import test from 'node:test'
import assert from 'node:assert/strict'
import { autogradeCodingSubmission, getAutograderPoints } from './service.js'

test('autograder returns 100 when all enabled checks pass', async () => {
  const result = await autogradeCodingSubmission({
    language: 'javascript',
    submissionCode: 'const playerName = "Alex";\nconst score = 1500;\nconsole.log(`${playerName}: ${score}`);',
    referenceSolution: 'const playerName = "Alex"; const score = 1500; console.log(`${playerName}: ${score}`);',
    referenceOutput: 'Alex: 1500',
    outputMatch: true,
    codeMatch: true,
    testCases: [],
    execute: async () => ({
      stdout: 'Alex: 1500\n',
      stderr: null,
      compile_output: null,
      status: { id: 3, description: 'Accepted' },
      time: '0.01',
      memory: 1024,
    }),
  })

  assert.equal(result.score, 100)
  assert.equal(getAutograderPoints(result.score, 20), 20)
  assert.equal(result.codeMatch?.passed, true)
  assert.equal(result.outputMatch?.passed, true)
})

test('autograder returns 50 when only some checks pass', async () => {
  const result = await autogradeCodingSubmission({
    language: 'javascript',
    submissionCode: 'const name = "Alex";\nconst total = 1500;\nconsole.log(name + ": " + total);',
    referenceSolution: 'const playerName = "Alex";\nconst score = 1500;\nconsole.log(`${playerName}: ${score}`);',
    referenceOutput: 'Alex: 1500',
    outputMatch: true,
    codeMatch: true,
    testCases: [],
    execute: async () => ({
      stdout: 'Alex: 1500\n',
      stderr: null,
      compile_output: null,
      status: { id: 3, description: 'Accepted' },
      time: '0.01',
      memory: 1024,
    }),
  })

  assert.equal(result.score, 50)
  assert.equal(getAutograderPoints(result.score, 20), 10)
  assert.equal(result.codeMatch?.passed, false)
  assert.equal(result.outputMatch?.passed, true)
})

test('autograder returns 0 when every check fails', async () => {
  const result = await autogradeCodingSubmission({
    language: 'javascript',
    submissionCode: 'console.log(1500);',
    referenceSolution: 'const playerName = "Alex";\nconst score = 1500;\nconsole.log(`${playerName}: ${score}`);',
    referenceOutput: 'Alex: 1500',
    outputMatch: true,
    codeMatch: true,
    testCases: [
      { input: 'Alex\n1500', expectedOutput: 'Alex: 1500' },
    ],
    execute: async ({ stdin }) => ({
      stdout: stdin ? '1500\n' : '1500\n',
      stderr: null,
      compile_output: null,
      status: { id: 3, description: 'Accepted' },
      time: '0.01',
      memory: 1024,
    }),
  })

  assert.equal(result.score, 0)
  assert.equal(getAutograderPoints(result.score, 20), 0)
  assert.equal(result.codeMatch?.passed, false)
  assert.equal(result.outputMatch?.passed, false)
  assert.equal(result.inputOutputCases?.[0]?.passed, false)
})
