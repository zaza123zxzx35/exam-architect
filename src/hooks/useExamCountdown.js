import { useEffect, useState } from 'react'
import { getCountdown } from '../data/examCalendar.js'

export function useExamCountdown(examId) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const sync = () => setNow(Date.now())
    const timer = window.setInterval(sync, 60_000)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  return getCountdown(now, examId)
}
