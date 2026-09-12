import { z } from 'zod'
import type { ExecuteResponse } from '../execute/judge0.js'

export const autograderTestCaseSchema = z.object({
  input: z.string().min(1).max(4096),
  expectedOutput: z.string().trim().min(1).max(4096),
})

const autograderCheckScoreSchema = z.union([z.literal(0), z.literal(50), z.literal(100)])

export const autograderResultSchema = z.object({
  score: autograderCheckScoreSchema,
  summary: z.string(),
  matchedChecks: z.int().min(0),
  totalChecks: z.int().min(1),
  codeMatch: z
    .object({
      passed: z.boolean(),
    })
    .nullable()
    .optional(),
  outputMatch: z
    .object({
      passed: z.boolean(),
      expectedOutput: z.string(),
      actualOutput: z.string().nullable(),
      status: z.string(),
    })
    .nullable()
    .optional(),
  inputOutputCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
        actualOutput: z.string().nullable(),
        passed: z.boolean(),
        status: z.string(),
      }),
    )
    .optional(),
})

export type AutograderTestCase = z.infer<typeof autograderTestCaseSchema>
export type AutograderResult = z.infer<typeof autograderResultSchema>

const normalizeCode = (value: string) => value.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim()
const normalizeOutput = (value: string | null | undefined) => (value ?? '').replace(/\r\n/g, '\n').trim()

const summarizeExecution = (result: ExecuteResponse) => {
  const stdout = normalizeOutput(result.stdout)
  const stderr = normalizeOutput(result.stderr)
  const compileOutput = normalizeOutput(result.compile_output)
  const status = result.status.description

  if (compileOutput) {
    return { output: compileOutput, status: `${status} (compile output)` }
  }

  if (stderr) {
    return { output: stdout || stderr, status: `${status} (stderr)` }
  }

  return { output: stdout, status }
}

export const parseAutograderResult = (value: unknown) => {
  const parsed = autograderResultSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export const parseAutograderTestCases = (value: unknown) => {
  const parsed = z.array(autograderTestCaseSchema).safeParse(value)
  return parsed.success ? parsed.data : []
}

export const isAutograderLanguageSupported = (language: string | null | undefined) =>
  Boolean(language && language !== 'html' && language !== 'web')

export const buildAutograderComment = (result: AutograderResult) =>
  `Autograder: ${result.summary}. Teacher can override this score.`

export const getAutograderPoints = (score: AutograderResult['score'], pointsPossible: number) => {
  if (score === 100) return pointsPossible
  if (score === 50) return Math.round(pointsPossible / 2)
  return 0
}

export const autogradeCodingSubmission = async ({
  language,
  submissionCode,
  referenceSolution,
  referenceOutput,
  outputMatch,
  codeMatch,
  testCases,
  execute,
}: {
  language: string
  submissionCode: string
  referenceSolution: string
  referenceOutput: string | null
  outputMatch: boolean
  codeMatch: boolean
  testCases: AutograderTestCase[]
  execute: (input: { language: string; code: string; stdin?: string | null }) => Promise<ExecuteResponse>
}): Promise<AutograderResult> => {
  const matchedChecks: boolean[] = []
  const result: Partial<AutograderResult> = {}

  if (codeMatch) {
    const passed = normalizeCode(submissionCode) === normalizeCode(referenceSolution)
    matchedChecks.push(passed)
    result.codeMatch = { passed }
  }

  if (outputMatch && referenceOutput) {
    const execution = await execute({ language, code: submissionCode })
    const { output, status } = summarizeExecution(execution)
    const expectedOutput = normalizeOutput(referenceOutput)
    const passed = normalizeOutput(output) === expectedOutput
    matchedChecks.push(passed)
    result.outputMatch = {
      passed,
      expectedOutput,
      actualOutput: output || null,
      status,
    }
  }

  if (testCases.length > 0) {
    const inputOutputCases: AutograderResult['inputOutputCases'] = []
    for (const testCase of testCases) {
      const execution = await execute({
        language,
        code: submissionCode,
        stdin: testCase.input,
      })
      const { output, status } = summarizeExecution(execution)
      const passed = normalizeOutput(output) === normalizeOutput(testCase.expectedOutput)
      matchedChecks.push(passed)
      inputOutputCases.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: output || null,
        passed,
        status,
      })
    }
    result.inputOutputCases = inputOutputCases
  }

  const totalChecks = matchedChecks.length
  const passedChecks = matchedChecks.filter(Boolean).length
  const score = passedChecks === 0 ? 0 : passedChecks === totalChecks ? 100 : 50

  let summary = 'complete mismatch'
  if (score === 100) {
    summary = `100% match (${passedChecks}/${totalChecks} checks passed)`
  } else if (score === 50) {
    summary = `partial match (${passedChecks}/${totalChecks} checks passed)`
  } else {
    summary = `complete mismatch (0/${totalChecks} checks passed)`
  }

  return autograderResultSchema.parse({
    ...result,
    score,
    summary,
    matchedChecks: passedChecks,
    totalChecks,
  })
}
