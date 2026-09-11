interface DirectionsEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  minHeightClassName?: string
}

const directionTemplates = [
  {
    label: '+ Objective',
    content: 'Objective:\n- Explain what students should complete.\n',
  },
  {
    label: '+ Steps',
    content: 'Steps:\n1. Open the activity resource.\n2. Complete the task.\n3. Submit your work.\n',
  },
  {
    label: '+ Checklist',
    content: 'Checklist:\n- I completed the task.\n- I reviewed my work.\n- I submitted my response.\n',
  },
  {
    label: '+ Feedback',
    content: 'What to submit:\n- Reflection, answer, or share link\n',
  },
]

const appendTemplate = (currentValue: string, template: string) =>
  currentValue.trim() ? `${currentValue.trim()}\n\n${template}` : template

export const DirectionsEditor = ({
  value,
  onChange,
  label = 'Directions',
  placeholder = 'Directions for students...',
  minHeightClassName = 'h-48',
}: DirectionsEditorProps) => (
  <div className="space-y-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label className="font-medium text-slate-700">{label}</label>
      <div className="flex flex-wrap gap-2">
        {directionTemplates.map((template) => (
          <button
            key={template.label}
            type="button"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
            onClick={() => onChange(appendTemplate(value, template.content))}
          >
            {template.label}
          </button>
        ))}
      </div>
    </div>
    <textarea
      className={`${minHeightClassName} w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400`}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
        {value.trim() || 'Directions preview will appear here.'}
      </p>
    </div>
  </div>
)
