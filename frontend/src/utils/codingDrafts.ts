import type { StarterFile } from '../types/models'

export interface CodingDraftSnapshot {
  id: string
  savedAt: string
  language: string
  submissionText: string
  submissionFiles: StarterFile[] | null
}

export interface CodingDraftRecord {
  updatedAt: string
  language: string
  submissionText: string
  submissionFiles: StarterFile[] | null
  history: CodingDraftSnapshot[]
}

interface SaveCodingDraftInput {
  activityId: string
  history?: CodingDraftSnapshot[]
  language: string
  submissionFiles?: StarterFile[] | null
  submissionText: string
  userId: string
}

const STORAGE_PREFIX = 'edu-platform:coding-draft'
const HISTORY_LIMIT = 3

const isStarterFile = (value: unknown): value is StarterFile =>
  typeof value === 'object'
  && value !== null
  && typeof Reflect.get(value, 'name') === 'string'
  && typeof Reflect.get(value, 'language') === 'string'
  && typeof Reflect.get(value, 'content') === 'string'

const normalizeFiles = (value: unknown): StarterFile[] | null => {
  if (!Array.isArray(value)) {
    return null
  }

  const files = value.filter(isStarterFile)
  return files.length > 0 ? files : null
}

export const buildCodingDraftKey = (userId: string, activityId: string) =>
  `${STORAGE_PREFIX}:${userId}:${activityId}`

export const serializeSubmissionFiles = (files: StarterFile[]) => JSON.stringify(files)

export const parseSubmissionFiles = (
  submissionText: string | null | undefined,
  fallback: StarterFile[] = [{ name: 'index.html', language: 'html', content: '' }],
): StarterFile[] => {
  if (!submissionText?.trim()) {
    return fallback
  }

  try {
    const parsed = JSON.parse(submissionText) as unknown
    const files = normalizeFiles(parsed)
    return files ?? fallback.map((file) => ({ ...file, content: submissionText }))
  } catch {
    return fallback.map((file) => ({ ...file, content: submissionText }))
  }
}

export const readCodingDraft = (userId: string, activityId: string): CodingDraftRecord | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(buildCodingDraftKey(userId, activityId))
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<CodingDraftRecord>
    if (
      typeof parsed.updatedAt !== 'string'
      || typeof parsed.language !== 'string'
      || typeof parsed.submissionText !== 'string'
    ) {
      return null
    }

    const history = Array.isArray(parsed.history)
      ? parsed.history.filter(
          (entry): entry is CodingDraftSnapshot =>
            typeof entry === 'object'
            && entry !== null
            && typeof Reflect.get(entry, 'id') === 'string'
            && typeof Reflect.get(entry, 'savedAt') === 'string'
            && typeof Reflect.get(entry, 'language') === 'string'
            && typeof Reflect.get(entry, 'submissionText') === 'string',
        ).map((entry) => ({
          ...entry,
          submissionFiles: normalizeFiles(entry.submissionFiles),
        }))
      : []

    return {
      updatedAt: parsed.updatedAt,
      language: parsed.language,
      submissionText: parsed.submissionText,
      submissionFiles: normalizeFiles(parsed.submissionFiles),
      history,
    }
  } catch {
    return null
  }
}

export const saveCodingDraft = ({
  activityId,
  history = [],
  language,
  submissionFiles = null,
  submissionText,
  userId,
}: SaveCodingDraftInput): CodingDraftRecord | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const nextDraft: CodingDraftRecord = {
    updatedAt: new Date().toISOString(),
    language,
    submissionText,
    submissionFiles,
    history: history.slice(0, HISTORY_LIMIT),
  }

  try {
    window.localStorage.setItem(buildCodingDraftKey(userId, activityId), JSON.stringify(nextDraft))
    return nextDraft
  } catch {
    return null
  }
}

export const saveCodingDraftCheckpoint = ({
  activityId,
  language,
  submissionFiles = null,
  submissionText,
  userId,
}: Omit<SaveCodingDraftInput, 'history'>): CodingDraftRecord | null => {
  const existing = readCodingDraft(userId, activityId)
  const previousHistory = existing?.history ?? []
  const latest = previousHistory[0]

  const nextHistory =
    latest
    && latest.language === language
    && latest.submissionText === submissionText
    && JSON.stringify(latest.submissionFiles ?? null) === JSON.stringify(submissionFiles ?? null)
      ? previousHistory
      : [
          {
            id: `${Date.now()}`,
            savedAt: new Date().toISOString(),
            language,
            submissionText,
            submissionFiles,
          },
          ...previousHistory,
        ].slice(0, HISTORY_LIMIT)

  return saveCodingDraft({
    activityId,
    history: nextHistory,
    language,
    submissionFiles,
    submissionText,
    userId,
  })
}
