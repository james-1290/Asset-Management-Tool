import { Outlet } from "react-router-dom"
import { Settings } from "lucide-react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { CommandSearch } from "@/components/command-search"
import { NotificationsBell } from "@/components/notifications-bell"
import { UserMenu } from "@/components/user-menu"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

export function Layout() {
  const { user } = useAuth()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-8 shrink-0">
          <div className="flex-1 max-w-2xl">
            <CommandSearch />
          </div>
          <div className="flex items-center gap-2 ml-8">
            <NotificationsBell />
            <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
              <Link to="/settings">
                <Settings className="h-5 w-5 text-muted-foreground" />
              </Link>
            </Button>
          </div>
          <div className="h-8 w-px bg-border mx-2" />
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold leading-none">{user.displayName}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">{user.roles?.[0] ?? "User"}</p>
              </div>
            )}
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 min-w-0">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
