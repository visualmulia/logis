'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('logis-theme') as Theme
    // Default sekarang adalah light
    const initial = saved || 'light'
    setTheme(initial)
    applyTheme(initial)
  }, [])

  function applyTheme(t: Theme) {
    const root = document.documentElement

    if (t === 'light') {
      // ── OPSI A: Light Professional ──
      root.style.setProperty('--bg-primary', '#F5F5F5')
      root.style.setProperty('--bg-secondary', '#FFFFFF')
      root.style.setProperty('--bg-card', '#FFFFFF')
      root.style.setProperty('--bg-input', '#F9F9F9')
      root.style.setProperty('--text-primary', '#1A1A1A')
      root.style.setProperty('--text-secondary', '#555555')
      root.style.setProperty('--text-muted', '#999999')
      root.style.setProperty('--border-color', '#E5E7EB')
      root.style.setProperty('--border-strong', '#D1D5DB')
      root.style.setProperty('--sidebar-bg', '#1A1A1A')
      root.style.setProperty('--sidebar-text', '#F5F0EB')
      root.style.setProperty('--sidebar-muted', 'rgba(245,240,235,0.5)')
      root.style.setProperty('--sidebar-border', 'rgba(245,240,235,0.08)')
      root.style.setProperty('--orange', '#F97316')
      document.body.style.background = '#F5F5F5'
      document.body.style.color = '#1A1A1A'
    } else {
      // ── Dark Mode ──
      root.style.setProperty('--bg-primary', '#0a0a0a')
      root.style.setProperty('--bg-secondary', '#111111')
      root.style.setProperty('--bg-card', '#111111')
      root.style.setProperty('--bg-input', '#0a0a0a')
      root.style.setProperty('--text-primary', '#f5f0eb')
      root.style.setProperty('--text-secondary', 'rgba(245,240,235,0.6)')
      root.style.setProperty('--text-muted', 'rgba(245,240,235,0.3)')
      root.style.setProperty('--border-color', 'rgba(245,240,235,0.08)')
      root.style.setProperty('--border-strong', 'rgba(245,240,235,0.15)')
      root.style.setProperty('--sidebar-bg', '#0d0d0d')
      root.style.setProperty('--sidebar-text', '#f5f0eb')
      root.style.setProperty('--sidebar-muted', 'rgba(245,240,235,0.4)')
      root.style.setProperty('--sidebar-border', 'rgba(245,240,235,0.06)')
      root.style.setProperty('--orange', '#F97316')
      document.body.style.background = '#0a0a0a'
      document.body.style.color = '#f5f0eb'
    }
  }

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    applyTheme(next)
    localStorage.setItem('logis-theme', next)
  }

  if (!mounted) return <>{children}</>

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}