import { useContext } from 'react'
import { ThemeContext } from '../context/theme-context'

export function useThemeCtx() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useThemeCtx must be used inside ThemeProvider')
  return context
}
