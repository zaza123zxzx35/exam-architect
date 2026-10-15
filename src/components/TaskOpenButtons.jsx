import { useState } from 'react'
import { Copy, ExternalLink } from 'lucide-react'
import { resolveTaskOpenAction } from '../lib/curated/taskOpenAction.js'

/**
 * Open / copy tutoring link buttons for a schedule task.
 * @param {{ task: object, className?: string }} props
 */
export default function TaskOpenButtons({ task, className = '' }) {
  const [copied, setCopied] = useState(false)
  const action = resolveTaskOpenAction(task)

  if (action.mode === 'none') return null

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(action.copyText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  if (action.mode === 'open') {
    return (
      <div className={`flex flex-col items-end gap-1 ${className}`}>
        <a
          className="btn-primary inline-flex items-center gap-1 text-xs"
          href={action.href}
          target="_blank"
          rel="noopener noreferrer"
          title={action.hintTh}
        >
          <ExternalLink className="h-3.5 w-3.5" /> {action.labelTh}
        </a>
        <button type="button" className="text-[10px] text-slate-500 underline" onClick={onCopy}>
          {copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
        </button>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-end gap-1 ${className}`}>
      <button
        type="button"
        className="btn-secondary inline-flex items-center gap-1 text-xs"
        onClick={onCopy}
        title={action.hintTh}
      >
        <Copy className="h-3.5 w-3.5" /> {copied ? 'คัดลอกแล้ว' : action.labelTh}
      </button>
      <span className="max-w-[10rem] text-right text-[10px] text-amber-700 dark:text-amber-300">
        {action.hintTh}
      </span>
    </div>
  )
}
