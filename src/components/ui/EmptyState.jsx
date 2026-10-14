/**
 * Accessible empty-state panel for lists and filtered views.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div
      role="status"
      className={`rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40 ${className}`}
    >
      {Icon ? (
        <Icon className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" aria-hidden="true" />
      ) : null}
      <h2 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-100">{title}</h2>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
