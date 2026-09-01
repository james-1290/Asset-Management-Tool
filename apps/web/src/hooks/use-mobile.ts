import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Read the width at first render rather than setting it from an effect: the
  // effect version rendered once with `undefined` (i.e. "not mobile") and then
  // immediately re-rendered, which is the cascading render the lint rule flags.
  const [isMobile, setIsMobile] = React.useState(
    () => window.innerWidth < MOBILE_BREAKPOINT,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
