import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { StatusBanner } from './ui'

/**
 * Confirm dialog before clearing all curated/live/victory managed tasks.
 * Opening / canceling must not mutate the schedule (caller responsibility).
 *
 * Portaled to document.body so parent overflow/transform cannot clip it.
 * Backdrop dismiss is armed after mount to avoid the opening click closing it.
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
  const titleId = useId()
  const [allowDismiss, setAllowDismiss] = useState(false)

  useEffect(() => {
    if (!open || !preview) {
      setAllowDismiss(false)
      return undefined
    }
    setAllowDismiss(false)
    const timer = window.setTimeout(() => setAllowDismiss(true), 250)
    return () => window.clearTimeout(timer)
  }, [open, preview])

  useEffect(() => {
    if (!open || !preview) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, preview])

  if (!open || !preview || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[1px]"
      role="presentation"
      onClick={() => {
        if (allowDismiss && !busy) onCancel()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && allowDismiss && !busy) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="card max-h-[85vh] w-full max-w-lg overflow-y-auto border-2 border-rose-300 shadow-2xl dark:border-rose-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-bold text-slate-900 dark:text-white">
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
            autoFocus
            onClick={onConfirm}
          >
            {busy ? 'กำลังล้าง…' : 'ยืนยันล้าง curated/ไลฟ์'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
