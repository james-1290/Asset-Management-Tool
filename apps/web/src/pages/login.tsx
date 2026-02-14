import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { SsoConfig } from "@/types/auth"

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login, loginWithToken } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ssoConfig, setSsoConfig] = useState<SsoConfig | null>(null)
  const [ssoLoading, setSsoLoading] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })

  // Handle SSO token callback
  useEffect(() => {
    const token = searchParams.get("token")
    const sso = searchParams.get("sso")
    if (token && sso === "1") {
      setSsoLoading(true)
      setSearchParams({}, { replace: true })
      loginWithToken(token)
        .then(() => navigate("/", { replace: true }))
        .catch(() => setError("SSO login failed. Please try again."))
        .finally(() => setSsoLoading(false))
    }
  }, [searchParams, setSearchParams, loginWithToken, navigate])

  // Fetch SSO config
  useEffect(() => {
    fetch("/api/v1/auth/sso-config")
      .then((res) => res.ok ? res.json() : null)
      .then((config: SsoConfig | null) => {
        if (config) setSsoConfig(config)
      })
      .catch(() => {})
  }, [])

  async function onSubmit(values: LoginFormValues) {
    setError(null)
    setLoading(true)
    try {
      await login(values.username, values.password)
      navigate("/", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  if (ssoLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Completing sign-in...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Asset Management</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" autoComplete="username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter password"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>

          {ssoConfig?.ssoEnabled && ssoConfig.ssoUrl && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  const url = ssoConfig.ssoUrl!
                  // Only allow relative URLs or same-origin URLs to prevent open redirect
                  if (url.startsWith("/") || url.startsWith(window.location.origin)) {
                    window.location.href = url
                  } else {
                    setError("Invalid SSO configuration. Please contact your administrator.")
                  }
                }}
              >
                {ssoConfig.ssoLabel ?? "Sign in with SSO"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
