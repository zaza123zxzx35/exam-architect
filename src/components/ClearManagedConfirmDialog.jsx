import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import { StatusBanner } from './ui'

/**
 * Confirm dialog before clearing all curated/live/victory managed tasks.
 * Uses the native <dialog> modal so it is not clipped by parent layout and
 * cannot be dismissed by the same click that opened it.
 *
 * The <dialog> element stays mounted while the parent is mounted so
 * showModal()/close() always run — unmounting an open modal without close()
 * can leave the document inert / with a stuck backdrop.
 *
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
  const titleId = useId()
  const dialogRef = useRef(null)
  const allowDismissRef = useRef(false)
  const onCancelRef = useRef(onCancel)
  const busyRef = useRef(busy)

  useLayoutEffect(() => {
    onCancelRef.current = onCancel
    busyRef.current = busy
  }, [onCancel, busy])

  const shouldShow = Boolean(open && preview)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return undefined

    if (shouldShow) {
      allowDismissRef.current = false
      if (!el.open) {
        try {
          el.showModal()
        } catch {
          el.setAttribute('open', '')
        }
      }
      const arm = window.setTimeout(() => {
        allowDismissRef.current = true
      }, 300)
      return () => window.clearTimeout(arm)
    }

    allowDismissRef.current = false
    if (el.open) {
      try {
        el.close()
      } catch {
        el.removeAttribute('open')
      }
    } else {
      el.removeAttribute('open')
    }
    return undefined
  }, [shouldShow])

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return undefined
    const onNativeCancel = (event) => {
      event.preventDefault()
      if (!allowDismissRef.current || busyRef.current) return
      onCancelRef.current()
    }
    el.addEventListener('cancel', onNativeCancel)
    return () => {
      el.removeEventListener('cancel', onNativeCancel)
      if (el.open) {
        try {
          el.close()
        } catch {
          el.removeAttribute('open')
        }
      }
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-hidden={shouldShow ? undefined : true}
      className="z-[200] w-[min(100%-2rem,32rem)] max-h-[85vh] overflow-y-auto rounded-2xl border-2 border-rose-300 bg-white p-0 shadow-2xl dark:border-rose-700 dark:bg-slate-900"
      onClick={(event) => {
        if (event.target !== dialogRef.current) return
        if (!allowDismissRef.current || busy) return
        onCancel()
      }}
    >
      <div className="card border-0 shadow-none">
        <h2 id={titleId} className="text-base font-bold text-slate-900 dark:text-white">
          ยืนยันก่อนล้างงาน curated / ไลฟ์
        </h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          ฟังก์ชันนี้ลบงานที่ระบบจัดการทั้งหมดในเครื่องนี้ รวมถึงงานที่ทำเสร็จแล้ว (done)
          และงานที่คุณแก้เอง (userEdited) · งานอื่นที่ไม่ใช่ curated/live/victory จะคงอยู่
        </p>

        {preview ? (
          <StatusBanner tone="error" className="mt-3" title={preview.summaryTh}>
            <ul className="mt-1 list-inside list-disc text-xs">
              <li>จะลบทั้งหมด: {preview.removeCount}</li>
              <li className="font-semibold">รวม done ที่จะหาย: {preview.removeDoneCount}</li>
              <li className="font-semibold">รวม userEdited ที่จะหาย: {preview.removeUserEditedCount}</li>
              <li>pending ที่จะหาย: {preview.removePendingCount}</li>
              <li>งานอื่นที่จะคงอยู่: {preview.keepCount}</li>
            </ul>
          </StatusBanner>
        ) : null}

        {preview?.sampleRemove?.length > 0 && (
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
            disabled={busy || !shouldShow}
            onClick={onCancel}
          >
            ยกเลิก — ไม่ลบอะไร
          </button>
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={busy || !shouldShow || !preview || preview.removeCount === 0}
            onClick={onConfirm}
          >
            {busy ? 'กำลังล้าง…' : 'ยืนยันล้าง curated/ไลฟ์'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
