import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

function initial(): Theme {
  const set = document.documentElement.dataset.theme
  if (set === 'dark' || set === 'light') return set
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Light/dark theme. The choice is remembered; until the user picks one, the system setting decides.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initial)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b1020' : '#f6f7f9')
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem('tpb-theme', next)
      } catch {
        /* storage blocked: the choice just won't be remembered */
      }
      return next
    })
  }, [])

  return { theme, toggle }
}
