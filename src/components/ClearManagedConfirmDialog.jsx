import { StatusBanner } from './ui'

/**
 * Confirm dialog before clearing all curated/live/victory managed tasks.
 * Opening / canceling must not mutate the schedule (caller responsibility).
 *
 * @param {{
 *   open: boolean,
 *   preview: null | {
 *     summaryTh: string,
 *     removeCount: number,
 *     removeDoneCount: number,
 *     removeUserEditedCount: number,
 *     removePendingCount: number,
 *     keepCount: number,
 *     sampleRemove: Array<{ id: string, title: string, plannedDate?: string | null, status?: string }>,
 *   },
 *   busy?: boolean,
 *   onConfirm: () => void,
 *   onCancel: () => void,
 * }} props
 */
export default function ClearManagedConfirmDialog({
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
        aria-labelledby="clear-managed-title"
        className="card max-h-[85vh] w-full max-w-lg overflow-y-auto border-rose-200 shadow-xl dark:border-rose-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="clear-managed-title" className="text-base font-bold text-slate-900 dark:text-white">
          ยืนยันก่อนล้างงาน curated / ไลฟ์
        </h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          ฟังก์ชันนี้ลบงานที่ระบบจัดการทั้งหมดในเครื่องนี้ รวมถึงงานที่ทำเสร็จแล้ว (done)
          และงานที่คุณแก้เอง (userEdited) · งานอื่นที่ไม่ใช่ curated/live/victory จะคงอยู่
        </p>

        <StatusBanner tone="error" className="mt-3" title={preview.summaryTh}>
          <ul className="mt-1 list-inside list-disc text-xs">
            <li>จะลบทั้งหมด: {preview.removeCount}</li>
            <li className="font-semibold">รวม done ที่จะหาย: {preview.removeDoneCount}</li>
            <li className="font-semibold">รวม userEdited ที่จะหาย: {preview.removeUserEditedCount}</li>
            <li>pending ที่จะหาย: {preview.removePendingCount}</li>
            <li>งานอื่นที่จะคงอยู่: {preview.keepCount}</li>
          </ul>
        </StatusBanner>

        {preview.sampleRemove?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              ตัวอย่างงานที่จะถูกลบ
            </p>
            <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-600 dark:text-slate-300">
              {preview.sampleRemove.map((row) => (
                <li key={row.id} className="truncate rounded-lg bg-slate-50 px-2 py-1 dark:bg-slate-800/80">
                  [{row.status || '?'}]
                  {row.plannedDate ? ` ${row.plannedDate} ·` : ' '}
                  {row.title}
                </li>
              ))}
              {preview.removeCount > preview.sampleRemove.length && (
                <li className="text-slate-500">
                  …และอีก {preview.removeCount - preview.sampleRemove.length} รายการ
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
            ยกเลิก — ไม่ลบอะไร
          </button>
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={busy || preview.removeCount === 0}
            onClick={onConfirm}
          >
            {busy ? 'กำลังล้าง…' : 'ยืนยันล้าง curated/ไลฟ์'}
          </button>
        </div>
      </div>
    </div>
  )
}
