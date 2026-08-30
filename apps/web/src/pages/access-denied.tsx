import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert } from "lucide-react"

/**
 * Shown when the identity provider signed the user in but the application
 * refused them — in practice, no app role assigned.
 *
 * There is deliberately no "try again" here: retrying sign-in would succeed at
 * the provider and land the user right back on this page. The fix is an
 * administrator assigning a role, so the only actions offered are signing out
 * (to try a different account) and the information an admin will ask for.
 */
export default function AccessDeniedPage() {
  const { forbiddenReason, logout } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Access not granted</CardTitle>
          <CardDescription>
            {forbiddenReason ??
              "Your account has no role assigned for this application. Ask an administrator to assign you a role."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You signed in successfully, but this application hasn't been granted to your
            account yet. An administrator needs to assign you a role before you can continue.
          </p>
          <Button variant="outline" className="w-full" onClick={logout}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
