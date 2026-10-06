import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

// index.html has already set the theme before React starts (light unless the user chose dark).
function initial(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

// Light/dark theme. Light is the default; the user's choice is remembered.
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
