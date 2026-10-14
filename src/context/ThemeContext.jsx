import { ThemeContext } from './theme-context'
import { useTheme } from '../hooks/useTheme'

export function ThemeProvider({ children }) {
  const theme = useTheme()
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}
