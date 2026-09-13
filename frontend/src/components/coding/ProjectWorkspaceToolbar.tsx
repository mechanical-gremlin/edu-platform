import React, { type ReactNode } from 'react'
import type { ExecutionUiState, RuntimeProfile, StepCapability } from '../../utils/runtimeProfiles'

void React

interface ProjectWorkspaceToolbarProps {
  executionState: ExecutionUiState
  fileTreeControl?: ReactNode
  leftStatus: string
  onPreviewRefresh?: () => void
  onRun?: () => void
  onStep?: () => void
  onStop?: () => void
  onTargetChange?: (target: string | null) => void
  previewDirty?: boolean
  previewNewTabUrl?: string | null
  runtimeProfile: RuntimeProfile
  runDisabled: boolean
  selectedTarget: string | null
  stepDisabled: boolean
  stepCapability: StepCapability
  stopDisabled: boolean
  targetEditable: boolean
  targetOptions: string[]
  targetSelectId: string
}

const buttonBaseClass = 'rounded px-3 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50'

export const ProjectWorkspaceToolbar = ({
  executionState,
  fileTreeControl,
  leftStatus,
  onPreviewRefresh,
  onRun,
  onStep,
  onStop,
  onTargetChange,
  previewDirty = false,
  previewNewTabUrl,
  runtimeProfile,
  runDisabled,
  selectedTarget,
  stepDisabled,
  stepCapability,
  stopDisabled,
  targetEditable,
  targetOptions,
  targetSelectId,
}: ProjectWorkspaceToolbarProps) => {
  const showExecutionControls = runtimeProfile === 'code'
  const canSelectTarget =
    targetEditable
    && targetOptions.length > 0
    && executionState !== 'running'
    && executionState !== 'stepping'
    && executionState !== 'stopping'
  const stepUnavailableReason = showExecutionControls && !stepCapability.supported
    ? stepCapability.reason
    : null

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-800 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        {fileTreeControl}
        <span className="truncate text-xs text-slate-300">{leftStatus}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={targetSelectId}>
          {runtimeProfile === 'web' ? 'Target page' : 'Target file'}
        </label>
        <select
          id={targetSelectId}
          className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          value={selectedTarget ?? ''}
          onChange={(event) => onTargetChange?.(event.target.value || null)}
          disabled={!canSelectTarget}
          aria-label={runtimeProfile === 'web' ? 'Target page' : 'Target file'}
        >
          {targetOptions.map((target) => (
            <option key={`${runtimeProfile}-${target}`} value={target}>
              {runtimeProfile === 'web' ? `Target page: ${target}` : `Target file: ${target}`}
            </option>
          ))}
        </select>
        {showExecutionControls ? (
          <>
            <button
              type="button"
              className={`${buttonBaseClass} bg-emerald-600 text-white hover:bg-emerald-700`}
              disabled={runDisabled}
              onClick={onRun}
            >
              {executionState === 'running' ? '▶ Running…' : '▶ Run'}
            </button>
            <button
              type="button"
              className={`${buttonBaseClass} border border-slate-600 text-slate-100 hover:bg-slate-700`}
              disabled={stepDisabled}
              onClick={onStep}
              title={stepCapability.reason}
              aria-describedby={stepUnavailableReason ? 'workspace-step-capability' : undefined}
            >
              ↷ Step
            </button>
            <button
              type="button"
              className={`${buttonBaseClass} border border-rose-500 text-rose-200 hover:bg-rose-900/40`}
              disabled={stopDisabled}
              onClick={onStop}
            >
              {executionState === 'stopping' ? '■ Stopping…' : '■ Stop'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`${buttonBaseClass} bg-emerald-600 text-white hover:bg-emerald-700`}
              onClick={onPreviewRefresh}
            >
              {previewDirty ? '▶ Refresh Preview *' : '▶ Refresh Preview'}
            </button>
            <a
              className={`rounded border px-3 py-1 text-xs font-medium ${
                previewNewTabUrl
                  ? 'border-slate-600 text-slate-100 hover:bg-slate-700'
                  : 'cursor-not-allowed border-slate-700 text-slate-500'
              }`}
              href={previewNewTabUrl ?? '#'}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!previewNewTabUrl}
              onClick={(event) => {
                if (!previewNewTabUrl) {
                  event.preventDefault()
                }
              }}
            >
              ↗ Open Preview Tab
            </a>
          </>
        )}
      </div>
      {stepUnavailableReason && (
        <p
          id="workspace-step-capability"
          className="w-full text-right text-[11px] text-slate-400"
          role="status"
        >
          {stepUnavailableReason}
        </p>
      )}
    </div>
  )
}
