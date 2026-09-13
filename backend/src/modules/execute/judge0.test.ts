import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import {
  createJudge0MultiFileArchive,
  isRetryableJudge0Failure,
} from './judge0.js'

test('isRetryableJudge0Failure retries network, timeout, and 5xx failures only', () => {
  assert.equal(isRetryableJudge0Failure({ isNetworkError: true }), true)
  assert.equal(isRetryableJudge0Failure({ isTimeout: true }), true)
  assert.equal(isRetryableJudge0Failure({ statusCode: 500 }), true)
  assert.equal(isRetryableJudge0Failure({ statusCode: 503 }), true)
  assert.equal(isRetryableJudge0Failure({ statusCode: 400 }), false)
  assert.equal(isRetryableJudge0Failure({ statusCode: 401 }), false)
  assert.equal(isRetryableJudge0Failure({ statusCode: 422 }), false)
})

test('createJudge0MultiFileArchive packages entrypoint, helpers, and run scripts for Python workspaces', async () => {
  const archiveBase64 = await createJudge0MultiFileArchive({
    language: 'python',
    entrypoint: 'main.py',
    files: [
      { path: 'main.py', content: 'from helpers.math_utils import add\nprint(add(2, 3))\n' },
      { path: 'helpers/math_utils.py', content: 'def add(a, b):\n    return a + b\n' },
      { path: 'data/input.txt', content: '5\n' },
    ],
  })

  const archive = await JSZip.loadAsync(Buffer.from(archiveBase64, 'base64'))
  assert.equal(await archive.file('main.py')?.async('string'), 'from helpers.math_utils import add\nprint(add(2, 3))\n')
  assert.equal(await archive.file('helpers/math_utils.py')?.async('string'), 'def add(a, b):\n    return a + b\n')
  assert.equal(await archive.file('data/input.txt')?.async('string'), '5\n')
  assert.match(await archive.file('run')?.async('string') ?? '', /python3 'main\.py'/)
  assert.equal(archive.file('compile'), null)
})

test('createJudge0MultiFileArchive adds compile and run scripts for Java workspaces', async () => {
  const archiveBase64 = await createJudge0MultiFileArchive({
    language: 'java',
    entrypoint: 'src/Main.java',
    files: [
      { path: 'src/Main.java', content: 'public class Main { public static void main(String[] args) { System.out.println("ok"); } }' },
      { path: 'src/Helper.java', content: 'public class Helper {}' },
    ],
  })

  const archive = await JSZip.loadAsync(Buffer.from(archiveBase64, 'base64'))
  assert.match(await archive.file('compile')?.async('string') ?? '', /javac -d \. 'src\/Helper\.java' 'src\/Main\.java'/)
  assert.match(await archive.file('run')?.async('string') ?? '', /java 'Main'/)
})

test('createJudge0MultiFileArchive compiles TypeScript workspaces to a Node-compatible dist entrypoint', async () => {
  const archiveBase64 = await createJudge0MultiFileArchive({
    language: 'typescript',
    entrypoint: 'src/index.ts',
    files: [
      { path: 'src/index.ts', content: 'import { greet } from "./lib/greet"\nconsole.log(greet())\n' },
      { path: 'src/lib/greet.ts', content: 'export const greet = () => "hello"\n' },
    ],
  })

  const archive = await JSZip.loadAsync(Buffer.from(archiveBase64, 'base64'))
  assert.match(await archive.file('compile')?.async('string') ?? '', /tsc --module commonjs --target es2020 --esModuleInterop --outDir dist 'src\/index\.ts' 'src\/lib\/greet\.ts'/)
  assert.match(await archive.file('run')?.async('string') ?? '', /node 'dist\/src\/index\.js'/)
})

test('createJudge0MultiFileArchive runs the entrypoint package for Go workspaces', async () => {
  const archiveBase64 = await createJudge0MultiFileArchive({
    language: 'go',
    entrypoint: 'cmd/app/main.go',
    files: [
      { path: 'go.mod', content: 'module example.com/demo\n\ngo 1.22\n' },
      { path: 'cmd/app/main.go', content: 'package main\n\nfunc main() {}\n' },
      { path: 'cmd/app/helpers.go', content: 'package main\n\nfunc helper() {}\n' },
      { path: 'internal/math/add.go', content: 'package math\n' },
    ],
  })

  const archive = await JSZip.loadAsync(Buffer.from(archiveBase64, 'base64'))
  assert.match(await archive.file('run')?.async('string') ?? '', /find '\.\/cmd\/app' -maxdepth 1 -name '\*\.go' -print \| sort/)
  assert.match(await archive.file('run')?.async('string') ?? '', /go run "\$\{go_files\[@\]\}"/)
})
