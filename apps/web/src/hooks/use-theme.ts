import { useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"

const THEMES: readonly Theme[] = ["light", "dark", "system"]

function readStoredTheme(): Theme {
  // Validate rather than blindly casting: a stale/garbage stored value must not
  // become an invalid Theme.
  const stored = localStorage.getItem("theme")
  return THEMES.includes(stored as Theme) ? (stored as Theme) : "system"
}

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme
  document.documentElement.classList.toggle("dark", resolved === "dark")
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => applyTheme("system")
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  const setTheme = (t: Theme) => {
    localStorage.setItem("theme", t)
    setThemeState(t)
  }

  return { theme, setTheme }
}
