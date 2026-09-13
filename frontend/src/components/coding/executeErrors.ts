export interface ExecuteErrorResponse {
  code?: string
  message?: string
  retryable?: boolean
  requestId?: string
}

const EXECUTE_ERROR_MESSAGES: Record<string, string> = {
  EXEC_PAYLOAD_TOO_LARGE: 'Execution input is too large. Reduce source code or stdin size and try again.',
  EXEC_TIMEOUT: 'Execution timed out before the result was ready. Please try again.',
  EXEC_UPSTREAM_ERROR: 'Execution service temporarily unavailable. Please try again.',
  EXECUTE_RATE_LIMITED: 'Execution rate limit exceeded. Please retry later.',
  ENTRYPOINT_MISSING: 'This project workspace needs an entrypoint before it can run.',
  ENTRYPOINT_INVALID: 'The selected entrypoint is not a valid file in this project workspace.',
  FILE_PATH_INVALID: 'One or more project workspace file paths are invalid.',
  EXECUTION_FAILED: 'Execution failed for this deterministic run target.',
}

export const getExecuteErrorMessage = (error: ExecuteErrorResponse, fallbackStatus: number) => {
  const baseMessage = error.code ? EXECUTE_ERROR_MESSAGES[error.code] ?? error.message : error.message
  const resolvedMessage = baseMessage?.trim() || `HTTP ${fallbackStatus}`
  const hasRetryGuidance = /try again|retry/i.test(resolvedMessage)

  if (!error.retryable || hasRetryGuidance) {
    return resolvedMessage
  }

  const separator = /[.!?]$/.test(resolvedMessage) ? ' ' : '. '
  return `${resolvedMessage}${separator}Please try again.`
}
