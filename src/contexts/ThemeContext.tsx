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
      // ── Light Mode: Clean & Readable ──
      root.style.setProperty('--bg-primary', '#F3F4F6')
      root.style.setProperty('--bg-secondary', '#FFFFFF')
      root.style.setProperty('--bg-card', '#FFFFFF')
      root.style.setProperty('--bg-input', '#F9FAFB')
      root.style.setProperty('--text-primary', '#111827')
      root.style.setProperty('--text-secondary', '#4B5563')
      root.style.setProperty('--text-muted', '#9CA3AF')
      root.style.setProperty('--border-color', '#E5E7EB')
      root.style.setProperty('--border-strong', '#D1D5DB')
      // Sidebar slate grey — kontras tapi tidak hitam pekat
      root.style.setProperty('--sidebar-bg', '#1E293B')
      root.style.setProperty('--sidebar-text', '#F8FAFC')
      root.style.setProperty('--sidebar-muted', '#94A3B8')
      root.style.setProperty('--sidebar-border', '#334155')
      root.style.setProperty('--orange', '#F97316')
      document.body.style.background = '#F3F4F6'
      document.body.style.color = '#111827'
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