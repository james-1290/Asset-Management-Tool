import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { isAdmin as isAdminRole, canWrite as canWriteRole } from "@/lib/permissions"
import type { UserProfile } from "@/types/auth"
import { redirectToLogout } from "@/lib/auth-urls"

/**
 * Authentication state.
 *
 * `forbidden` is distinct from `unauthenticated` on purpose. The platform
 * (Azure App Service / Entra) has signed the user in, but the application
 * refuses them — typically because no app role is assigned. Sending them back
 * to the identity provider would succeed and return them here unchanged, so the
 * UI must explain the problem rather than retry.
 */
type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "forbidden"

interface AuthContextValue {
  user: UserProfile | null
  status: AuthStatus
  isAuthenticated: boolean
  isLoading: boolean
  isAdmin: boolean
  /**
   * Whether this user may create or change records.
   *
   * Writes require Admin or Operator; the read-only User role may only read.
   * Offering a create or edit control to a read-only user isn't harmless — the
   * API correctly refuses the write, so they fill in a whole form and are then
   * told "Access denied".
   */
  canWrite: boolean
  /** Message from the server explaining a `forbidden` status, if it gave one. */
  forbiddenReason: string | null
  logout: () => void
  updateUser: (profile: UserProfile) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [forbiddenReason, setForbiddenReason] = useState<string | null>(null)

  useEffect(() => {
    // Abort on unmount rather than ignoring a late response. A fetch whose body
    // is never read leaves the connection open in the browser — under React
    // StrictMode's double-invoked effects that leaked one request per mount,
    // which among other things means the page never reaches network idle.
    const controller = new AbortController()

    // The session lives in the platform's auth cookie, so there is nothing to
    // read from storage — ask the API who we are.
    fetch("/api/v1/auth/me", { credentials: "same-origin", signal: controller.signal })
      .then(async (res) => {
        if (res.ok) {
          const profile: UserProfile = await res.json()
          setUser(profile)
          setStatus("authenticated")
          syncTheme(profile.themePreference)
          return
        }

        if (res.status === 403) {
          // Signed in with the identity provider, but refused by this app —
          // no app role assigned. Retrying sign-in cannot fix it.
          const body = await res.json().catch(() => null)
          setForbiddenReason(body?.error ?? null)
          setStatus("forbidden")
          return
        }

        // Drain the body so the connection is released.
        await res.text().catch(() => undefined)
        setStatus("unauthenticated")
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        setStatus("unauthenticated")
      })

    return () => controller.abort()
  }, [])

  // Sign-out is the platform's job: it clears the auth cookie and ends the
  // federated session, so this is a full-page navigation, not a state change.
  const logout = useCallback(() => {
    redirectToLogout()
  }, [])

  const updateUser = useCallback((profile: UserProfile) => {
    setUser(profile)
    syncTheme(profile.themePreference)
  }, [])

  // The rules live in lib/permissions so they can be unit-tested directly.
  const isAdmin = isAdminRole(user?.roles)
  const canWrite = canWriteRole(user?.roles)

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        isAuthenticated: status === "authenticated",
        isLoading: status === "loading",
        isAdmin,
        canWrite,
        forbiddenReason,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

function syncTheme(preference?: string | null) {
  const theme = preference || "system"
  localStorage.setItem("theme", theme)
  const resolved = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme
  document.documentElement.classList.toggle("dark", resolved === "dark")
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
