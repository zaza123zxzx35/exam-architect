import { StatusBanner } from './ui'

/**
 * Confirm dialog before force-regenerating แผนพาบรรจุ 100.
 * Opening / canceling must not mutate the schedule (caller responsibility).
 *
 * @param {{
 *   open: boolean,
 *   preview: null | {
 *     summaryTh: string,
 *     replaceCount: number,
 *     keepDoneCount: number,
 *     keepUserEditedCount: number,
 *     sampleReplace: Array<{ id: string, title: string, plannedDate?: string | null }>,
 *   },
 *   busy?: boolean,
 *   onConfirm: () => void,
 *   onCancel: () => void,
 * }} props
 */
export default function ForceRegenConfirmDialog({
  open,
  preview,
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open || !preview) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      role="presentation"
      onClick={() => {
        if (!busy) onCancel()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !busy) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="force-regen-title"
        className="card max-h-[85vh] w-full max-w-lg overflow-y-auto border-amber-200 shadow-xl dark:border-amber-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="force-regen-title" className="text-base font-bold text-slate-900 dark:text-white">
          ยืนยันก่อนจัดแผน 100/100
        </h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          งานที่ทำเสร็จแล้ว (done) และงานที่คุณแก้เอง (userEdited) จะถูกเก็บไว้
          · งาน pending ที่ระบบจัดการจะถูกแทนที่ด้วยแผนใหม่
        </p>

        <StatusBanner tone="warning" className="mt-3" title={preview.summaryTh}>
          <ul className="mt-1 list-inside list-disc text-xs">
            <li>แทนที่ pending: {preview.replaceCount}</li>
            <li>คง done: {preview.keepDoneCount}</li>
            <li>คง userEdited: {preview.keepUserEditedCount}</li>
          </ul>
        </StatusBanner>

        {preview.sampleReplace?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              ตัวอย่างงานที่จะถูกแทนที่
            </p>
            <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-600 dark:text-slate-300">
              {preview.sampleReplace.map((row) => (
                <li key={row.id} className="truncate rounded-lg bg-slate-50 px-2 py-1 dark:bg-slate-800/80">
                  {row.plannedDate ? `${row.plannedDate} · ` : ''}
                  {row.title}
                </li>
              ))}
              {preview.replaceCount > preview.sampleReplace.length && (
                <li className="text-slate-500">
                  …และอีก {preview.replaceCount - preview.sampleReplace.length} รายการ
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={busy}
            onClick={onCancel}
          >
            ยกเลิก — ไม่เปลี่ยนแผน
          </button>
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'กำลังจัดแผน…' : 'ยืนยันจัดแผน 100/100'}
          </button>
        </div>
      </div>
    </div>
  )
}
