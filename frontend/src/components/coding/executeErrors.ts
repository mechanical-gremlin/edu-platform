export interface ExecuteErrorResponse {
  code?: string
  message?: string
  retryable?: boolean
  requestId?: string
}

const EXECUTE_ERROR_MESSAGES: Record<string, string> = {
  EXEC_TIMEOUT: 'Execution timed out before the result was ready.',
  EXEC_UPSTREAM_ERROR: 'Execution service temporarily unavailable.',
}

export const getExecuteErrorMessage = (error: ExecuteErrorResponse, fallbackStatus: number) => {
  const baseMessage = error.code ? EXECUTE_ERROR_MESSAGES[error.code] ?? error.message : error.message
  const resolvedMessage = baseMessage?.trim() || `HTTP ${fallbackStatus}`

  return error.retryable ? `${resolvedMessage} Please try again.` : resolvedMessage
}
