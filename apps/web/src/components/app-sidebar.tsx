import { useAuth } from "@/contexts/auth-context"
import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Monitor,
  ShieldCheck,
  AppWindow,
  Building2,
  Bell,
  ScrollText,
  Settings,
  BarChart3,
  Upload,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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

interface NavChild {
  title: string
  url: string
}

interface NavItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  section: string
  children?: NavChild[]
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, section: "MENU" },
  {
    title: "Assets", url: "/assets", icon: Monitor, section: "MENU",
    children: [
      { title: "Asset Types", url: "/asset-types" },
      { title: "Asset Templates", url: "/asset-templates" },
    ],
  },
  {
    title: "Certificates", url: "/certificates", icon: ShieldCheck, section: "MENU",
    children: [
      { title: "Certificate Types", url: "/certificate-types" },
    ],
  },
  {
    title: "Software", url: "/applications", icon: AppWindow, section: "MENU",
    children: [
      { title: "Application Types", url: "/application-types" },
    ],
  },
  {
    title: "Organisation", url: "/locations", icon: Building2, section: "MENU",
    children: [
      { title: "Locations", url: "/locations" },
      { title: "People", url: "/people" },
    ],
  },
  { title: "Reports", url: "/reports", icon: BarChart3, section: "MANAGEMENT" },
  { title: "Notifications", url: "/notifications", icon: Bell, section: "MANAGEMENT" },
  { title: "Import Data", url: "/tools/import", icon: Upload, section: "MANAGEMENT", adminOnly: true },
  { title: "Audit Log", url: "/audit-log", icon: ScrollText, section: "MANAGEMENT" },
  { title: "Settings", url: "/settings", icon: Settings, section: "MANAGEMENT" },
]

export function AppSidebar() {
  const { toggleSidebar } = useSidebar()
  const { isAdmin } = useAuth()
  const location = useLocation()

  // True when we're on the parent's own page (not a child page)
  const isItemSelfActive = (item: NavItem) => {
    if (item.url === "/") return location.pathname === "/"
    return location.pathname === item.url || location.pathname.startsWith(item.url + "/")
  }

  // True when parent or any child is active (used to expand sub-menu + highlight parent)
  const isItemOrChildActive = (item: NavItem) => {
    if (isItemSelfActive(item)) return true
    if (item.children) {
      return item.children.some((child) => location.pathname.startsWith(child.url))
    }
    return false
  }

  // True only when a child URL matches (not the parent itself)
  const isAnyChildActive = (item: NavItem) => {
    if (!item.children) return false
    return item.children.some((child) => location.pathname.startsWith(child.url))
  }

  const isChildActive = (url: string) => {
    return location.pathname.startsWith(url)
  }

  // Filter admin-only items
  const filteredItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false
    return true
  })

  // Group by section
  const sections = new Map<string, NavItem[]>()
  for (const item of filteredItems) {
    if (!sections.has(item.section)) sections.set(item.section, [])
    sections.get(item.section)!.push(item)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b h-16 px-3 !flex-row items-center">
        {/* Expanded: logo + title + collapse chevron */}
        <div className="flex flex-1 items-center gap-3 overflow-hidden group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground text-xs font-bold shrink-0">
            AM
          </div>
          <div className="min-w-0">
            <span className="text-base font-bold block truncate leading-none">Asset Manager</span>
            <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-widest mt-0.5">Asset Management</span>
          </div>
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
        {Array.from(sections.entries()).map(([sectionLabel, items], sectionIdx) => (
          <SidebarGroup key={sectionLabel} className={sectionIdx > 0 ? "border-t border-sidebar-border" : ""}>
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3">
              {sectionLabel}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
                  const selfActive = isItemSelfActive(item)
                  const anyChildActive = isAnyChildActive(item)
                  const expanded = isItemOrChildActive(item)
                  // Highlight parent blue only when on its own page, not when on a child page
                  const parentHighlighted = selfActive && !anyChildActive

                  const activeStyle = { backgroundColor: "rgba(41, 24, 220, 0.1)", color: "var(--primary)" } as const
                  const inactiveStyle = { backgroundColor: "transparent", color: "inherit" } as const

                  return (
                    <div key={item.title}>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip={item.title}>
                          <NavLink
                            to={item.url}
                            end={!item.children}
                            style={parentHighlighted ? activeStyle : inactiveStyle}
                          >
                            <item.icon className={parentHighlighted ? "h-[22px] w-[22px]" : expanded ? "h-[22px] w-[22px]" : "h-[22px] w-[22px] text-gray-400 dark:text-gray-500"} />
                            <span className="text-sm">{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {expanded && item.children && item.children.length > 0 && (
                        <SidebarMenuSub>
                          {item.children!.map((child) => {
                            const childActive = isChildActive(child.url)
                            return (
                              <SidebarMenuSubItem key={child.title}>
                                <SidebarMenuSubButton asChild>
                                  <NavLink
                                    to={child.url}
                                    style={childActive
                                      ? { backgroundColor: "rgba(41, 24, 220, 0.1)", color: "var(--primary)", borderRadius: "6px" }
                                      : { color: "var(--muted-foreground)" }
                                    }
                                  >
                                    <span>{child.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          })}
                        </SidebarMenuSub>
                      )}
                    </div>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
