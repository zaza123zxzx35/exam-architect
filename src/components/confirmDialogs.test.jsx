/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ForceRegenConfirmDialog from './ForceRegenConfirmDialog.jsx'
import ClearManagedConfirmDialog from './ClearManagedConfirmDialog.jsx'
import VictoryPlanCard from './VictoryPlanCard.jsx'

vi.mock('../hooks/useScheduleStore', () => ({
  useScheduleStore: vi.fn(),
}))

import { useScheduleStore } from '../hooks/useScheduleStore'

beforeEach(() => {
  // jsdom may lack full HTMLDialogElement modal support
  if (typeof HTMLDialogElement !== 'undefined') {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '')
      this.open = true
    }
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open')
      this.open = false
    }
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ForceRegenConfirmDialog', () => {
  const preview = {
    summaryTh: 'จะแทนที่งาน pending 2 รายการ',
    replaceCount: 2,
    keepDoneCount: 1,
    keepUserEditedCount: 0,
    sampleReplace: [{ id: 'a', title: 'งานตัวอย่าง', plannedDate: '2026-10-15' }],
  }

  it('opens a native dialog when open+preview are set', async () => {
    render(
      <ForceRegenConfirmDialog
        open
        preview={preview}
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    )
    const dialog = await screen.findByRole('dialog', { hidden: true }).catch(() =>
      document.querySelector('dialog'),
    )
    expect(dialog).toBeTruthy()
    expect(screen.getByText('ยืนยันก่อนจัดแผน 100/100')).toBeTruthy()
    expect(screen.getByText(/แทนที่ pending: 2/)).toBeTruthy()
  })

  it('cancel and confirm fire different callbacks', async () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(
      <ForceRegenConfirmDialog
        open
        preview={preview}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /ยกเลิก — ไม่เปลี่ยนแผน/ }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()

    onCancel.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /ยืนยันจัดแผน 100\/100/ }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('keeps the dialog element mounted when closed so close() can release the top layer', () => {
    const { container, rerender } = render(
      <ForceRegenConfirmDialog
        open
        preview={preview}
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    )
    const dialog = container.querySelector('dialog')
    expect(dialog).toBeTruthy()
    expect(dialog?.open || dialog?.hasAttribute('open')).toBeTruthy()

    rerender(
      <ForceRegenConfirmDialog
        open={false}
        preview={null}
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    )
    // Must stay in the DOM; unmounting an open modal without close() leaves the page inert.
    expect(container.querySelector('dialog')).toBe(dialog)
    expect(dialog?.open || dialog?.hasAttribute('open')).toBeFalsy()
  })
})

describe('ClearManagedConfirmDialog', () => {
  it('shows wipe scope including done and keeps cancel separate', () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(
      <ClearManagedConfirmDialog
        open
        preview={{
          summaryTh: 'จะลบ 3',
          removeCount: 3,
          removeDoneCount: 1,
          removeUserEditedCount: 1,
          removePendingCount: 1,
          keepCount: 2,
          sampleRemove: [{ id: 'x', title: 'ลบฉัน', status: 'done' }],
        }}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )
    expect(screen.getByText('ยืนยันก่อนล้างงาน curated / ไลฟ์')).toBeTruthy()
    expect(screen.getByText(/รวม done ที่จะหาย: 1/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /ยกเลิก — ไม่ลบอะไร/ }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

describe('VictoryPlanCard force button', () => {
  it('clicking จัดแผน 100/100 opens the confirm dialog without mutating tasks', async () => {
    const setSchedule = vi.fn()
    const schedule = {
      tasks: [
        {
          id: 'curated_demo',
          title: 'งานทดสอบ',
          status: 'pending',
          origin: 'victory-plan-100',
          plannedDate: '2026-10-15',
        },
      ],
      meta: {},
    }
    useScheduleStore.mockReturnValue({ schedule, setSchedule })

    render(
      <MemoryRouter>
        <VictoryPlanCard />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /จัดแผน 100\/100/ }))

    await waitFor(() => {
      expect(screen.getByText('ยืนยันก่อนจัดแผน 100/100')).toBeTruthy()
    })
    expect(setSchedule).not.toHaveBeenCalled()
    expect(screen.getByText(/เปิดหน้าต่างยืนยันแล้ว/)).toBeTruthy()
  })

  it('cancel closes dialog without mutating; confirm calls setSchedule once', async () => {
    const setSchedule = vi.fn()
    const schedule = {
      tasks: [
        {
          id: 'curated_demo',
          title: 'งานทดสอบ',
          status: 'pending',
          origin: 'victory-plan-100',
          plannedDate: '2026-10-15',
        },
      ],
      meta: {},
    }
    useScheduleStore.mockReturnValue({ schedule, setSchedule })

    render(
      <MemoryRouter>
        <VictoryPlanCard />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /จัดแผน 100\/100/ }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ยกเลิก — ไม่เปลี่ยนแผน/ })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /ยกเลิก — ไม่เปลี่ยนแผน/ }))
    expect(setSchedule).not.toHaveBeenCalled()

    // Re-open after cancel — must work (regression for stuck top-layer).
    fireEvent.click(screen.getByRole('button', { name: /จัดแผน 100\/100/ }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ยืนยันจัดแผน 100\/100/ })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /ยืนยันจัดแผน 100\/100/ }))
    expect(setSchedule).toHaveBeenCalledTimes(1)
  })
})
