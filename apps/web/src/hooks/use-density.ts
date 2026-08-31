import { useCallback, useEffect, useState } from "react"

export type Density = "comfortable" | "compact"

const DENSITIES: readonly Density[] = ["comfortable", "compact"]
const STORAGE_KEY = "table-density"
const CHANGE_EVENT = "table-density-change"

function readStoredDensity(): Density {
  // Validate rather than blindly casting: a stale or garbage stored value must
  // not become an invalid Density. Mirrors useTheme.
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return DENSITIES.includes(stored as Density) ? (stored as Density) : "comfortable"
  } catch {
    // Private browsing and blocked site data throw on access.
    return "comfortable"
  }
}

/**
 * Row density for the shared DataTable, remembered across lists and reloads.
 *
 * It is deliberately one app-wide setting rather than per-list state: someone
 * who wants a dense table wants it everywhere, and a per-page choice was how
 * this control ended up existing on exactly one list.
 *
 * Several tables can be mounted at once, so changes are broadcast on a custom
 * event — `storage` only fires in *other* tabs, which would leave the current
 * one stale.
 */
export function useDensity() {
  const [density, setDensityState] = useState<Density>(readStoredDensity)

  useEffect(() => {
    const sync = () => setDensityState(readStoredDensity())
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  const setDensity = useCallback((next: Density) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not being able to remember it is not a reason to ignore the click.
    }
    setDensityState(next)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  return { density, setDensity }
}
