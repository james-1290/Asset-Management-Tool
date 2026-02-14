import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Monitor,
  Tag,
  ShieldCheck,
  FileKey,
  AppWindow,
  MapPin,
  Users,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Package,
  Building2,
  Laptop,
  Wrench,
  BarChart3,
  Upload,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface NavChild {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavGroup {
  kind: "group"
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: NavChild[]
}

interface NavStandalone {
  kind: "standalone"
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
}

type NavEntry = NavGroup | NavStandalone

const navStructure: NavEntry[] = [
  { kind: "standalone", title: "Dashboard", url: "/", icon: LayoutDashboard },
  {
    kind: "group",
    title: "Inventory",
    icon: Package,
    children: [
      { title: "Assets", url: "/assets", icon: Monitor },
      { title: "Asset Types", url: "/asset-types", icon: Tag },
      { title: "Asset Templates", url: "/asset-templates", icon: Tag },
    ],
  },
  {
    kind: "group",
    title: "Certificates",
    icon: ShieldCheck,
    children: [
      { title: "Certificates", url: "/certificates", icon: ShieldCheck },
      { title: "Certificate Types", url: "/certificate-types", icon: FileKey },
    ],
  },
  {
    kind: "group",
    title: "Software",
    icon: Laptop,
    children: [
      { title: "Applications / Licences", url: "/applications", icon: AppWindow },
      { title: "Application Types", url: "/application-types", icon: Tag },
    ],
  },
  {
    kind: "group",
    title: "Organisation",
    icon: Building2,
    children: [
      { title: "Locations", url: "/locations", icon: MapPin },
      { title: "People", url: "/people", icon: Users },
    ],
  },
  {
    kind: "group",
    title: "Tools",
    icon: Wrench,
    children: [
      { title: "Reports", url: "/reports", icon: BarChart3 },
      { title: "Import Data", url: "/tools/import", icon: Upload },
    ],
  },
  { kind: "standalone", title: "Audit Log", url: "/audit-log", icon: ScrollText },
  { kind: "standalone", title: "Settings", url: "/settings", icon: Settings },
]

const STORAGE_KEY = "sidebar-groups"

function loadGroupState(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    // ignore
  }
  return {}
}

function saveGroupState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export function AppSidebar() {
  const { toggleSidebar } = useSidebar()
  const { isAdmin } = useAuth()
  const location = useLocation()
  const [groupState, setGroupState] = useState<Record<string, boolean>>(loadGroupState)

  useEffect(() => {
    saveGroupState(groupState)
  }, [groupState])

  const toggleGroup = useCallback((groupTitle: string) => {
    setGroupState((prev) => ({
      ...prev,
      [groupTitle]: !(prev[groupTitle] ?? false),
    }))
  }, [])

  const isGroupOpen = (groupTitle: string) => groupState[groupTitle] ?? false

  const isChildActive = (children: NavChild[]) =>
    children.some((child) => {
      if (child.url === "/") return location.pathname === "/"
      return location.pathname.startsWith(child.url)
    })

  // Filter admin-only items
  const filteredNav = navStructure.map((entry) => {
    if (entry.kind === "group" && entry.title === "Tools") {
      const children = entry.children.filter((child) => {
        if (child.url === "/tools/import") return isAdmin
        return true
      })
      return children.length > 0 ? { ...entry, children } : null
    }
    return entry
  }).filter(Boolean) as NavEntry[]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b h-14 px-3 !flex-row items-center">
        {/* Expanded: title + collapse chevron */}
        <div className="flex flex-1 items-center gap-2 overflow-hidden group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shrink-0">
            AM
          </div>
          <span className="text-sm font-semibold truncate">Asset Manager</span>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={toggleSidebar}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Collapse sidebar</span>
            </Button>
          </div>
        </div>

        {/* Collapsed: expand chevron */}
        <div className="hidden items-center justify-center group-data-[collapsible=icon]:flex">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={toggleSidebar}
              >
                <ChevronRight className="size-4" />
                <span className="sr-only">Expand sidebar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNav.map((entry) => {
                if (entry.kind === "standalone") {
                  return (
                    <SidebarMenuItem key={entry.title}>
                      <SidebarMenuButton asChild tooltip={entry.title}>
                        <NavLink
                          to={entry.url}
                          className={({ isActive }) =>
                            isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                          }
                        >
                          <entry.icon className="h-4 w-4" />
                          <span>{entry.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                }

                const groupOpen = isGroupOpen(entry.title)
                const hasActiveChild = isChildActive(entry.children)

                return (
                  <Collapsible
                    key={entry.title}
                    open={groupOpen}
                    onOpenChange={() => toggleGroup(entry.title)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={entry.title}
                          className={hasActiveChild && !groupOpen ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                        >
                          <entry.icon className="h-4 w-4" />
                          <span>{entry.title}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {entry.children.map((child) => (
                            <SidebarMenuSubItem key={child.title}>
                              <SidebarMenuSubButton asChild>
                                <NavLink
                                  to={child.url}
                                  className={({ isActive }) =>
                                    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                                  }
                                >
                                  <child.icon className="h-4 w-4" />
                                  <span>{child.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
