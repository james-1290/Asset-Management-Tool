import { useEffect } from "react"
import { Outlet } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { redirectToLogin } from "@/lib/auth-urls"
import AccessDeniedPage from "@/pages/access-denied"

export function ProtectedRoute() {
  const { status } = useAuth()

  // Sign-in leaves the origin, so it's a browser navigation rather than a
  // client-side route change — hence an effect instead of <Navigate>.
  useEffect(() => {
    if (status === "unauthenticated") redirectToLogin()
  }, [status])

  if (status === "forbidden") return <AccessDeniedPage />

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">
          {status === "unauthenticated" ? "Redirecting to sign in..." : "Loading..."}
        </div>
      </div>
    )
  }

  return <Outlet />
}
