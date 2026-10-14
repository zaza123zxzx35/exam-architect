/**
 * Horizontal filter chip group. Keeps unknown/mixed options selectable when provided.
 */
export default function FilterChips({
  options,
  value,
  onChange,
  ariaLabel = 'ตัวกรอง',
  className = '',
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`flex flex-wrap gap-2 ${className}`}
    >
      {options.map(option => {
        const id = typeof option === 'string' ? option : option.id
        const label = typeof option === 'string' ? option : option.label
        const selected = value === id
        return (
          <button
            key={id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              selected
                ? 'border-primary-700 bg-primary-700 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
