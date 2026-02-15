import { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { UserProfile, LoginResponse } from "@/types/auth"

interface AuthContextValue {
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isAdmin: boolean
  login: (username: string, password: string) => Promise<void>
  loginWithToken: (token: string) => Promise<void>
  logout: () => void
  updateUser: (profile: UserProfile) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(() => !!localStorage.getItem("token"))

  useEffect(() => {
    const savedToken = localStorage.getItem("token")
    if (!savedToken) return

    // Validate token by calling /auth/me
    fetch("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${savedToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token")
        return res.json()
      })
      .then((profile: UserProfile) => {
        setToken(savedToken)
        setUser(profile)
        syncTheme(profile.themePreference)
      })
      .catch(() => {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Login failed")
    }

    const data: LoginResponse = await res.json()
    localStorage.setItem("token", data.token)
    localStorage.setItem("user", JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
    syncTheme(data.user.themePreference)
  }, [])

  const loginWithToken = useCallback(async (ssoToken: string) => {
    const res = await fetch("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${ssoToken}` },
    })
    if (!res.ok) throw new Error("Invalid SSO token")

    const profile: UserProfile = await res.json()
    localStorage.setItem("token", ssoToken)
    localStorage.setItem("user", JSON.stringify(profile))
    setToken(ssoToken)
    setUser(profile)
    syncTheme(profile.themePreference)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setToken(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((profile: UserProfile) => {
    setUser(profile)
    localStorage.setItem("user", JSON.stringify(profile))
    syncTheme(profile.themePreference)
  }, [])

  const isAdmin = user?.roles?.includes("Admin") ?? false

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        isAdmin,
        login,
        loginWithToken,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

function syncTheme(preference?: string | null) {
  if (preference) {
    localStorage.setItem("theme", preference)
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
