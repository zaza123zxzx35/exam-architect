import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import { StatusBanner } from './ui'

/**
 * Confirm dialog before force-regenerating แผนพาบรรจุ 100.
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
          // Older environments without showModal — still render visibly.
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
      // Ensure top-layer is released if the parent unmounts while open.
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
      className="z-[200] w-[min(100%-2rem,32rem)] max-h-[85vh] overflow-y-auto rounded-2xl border-2 border-amber-300 bg-white p-0 shadow-2xl dark:border-amber-700 dark:bg-slate-900"
      onClick={(event) => {
        if (event.target !== dialogRef.current) return
        if (!allowDismissRef.current || busy) return
        onCancel()
      }}
    >
      <div className="card border-0 shadow-none">
        <h2 id={titleId} className="text-base font-bold text-slate-900 dark:text-white">
          ยืนยันก่อนจัดแผน 100/100
        </h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          งานที่ทำเสร็จแล้ว (done) และงานที่คุณแก้เอง (userEdited) จะถูกเก็บไว้
          · งาน pending ที่ระบบจัดการจะถูกแทนที่ด้วยแผนใหม่
        </p>

        {preview ? (
          <StatusBanner tone="warning" className="mt-3" title={preview.summaryTh}>
            <ul className="mt-1 list-inside list-disc text-xs">
              <li>แทนที่ pending: {preview.replaceCount}</li>
              <li>คง done: {preview.keepDoneCount}</li>
              <li>คง userEdited: {preview.keepUserEditedCount}</li>
            </ul>
          </StatusBanner>
        ) : null}

        {preview?.sampleReplace?.length > 0 && (
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
            disabled={busy || !shouldShow}
            onClick={onCancel}
          >
            ยกเลิก — ไม่เปลี่ยนแผน
          </button>
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={busy || !shouldShow || !preview}
            onClick={onConfirm}
          >
            {busy ? 'กำลังจัดแผน…' : 'ยืนยันจัดแผน 100/100'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
