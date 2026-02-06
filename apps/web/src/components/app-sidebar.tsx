import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Monitor,
  Tag,
  ShieldCheck,
  AppWindow,
  MapPin,
  Users,
  ScrollText,
  Settings,
  ChevronLeft,
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
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Assets", url: "/assets", icon: Monitor },
  { title: "Asset Types", url: "/asset-types", icon: Tag },
  { title: "Certificates", url: "/certificates", icon: ShieldCheck },
  { title: "Applications / Licences", url: "/applications", icon: AppWindow },
  { title: "Locations", url: "/locations", icon: MapPin },
  { title: "People", url: "/people", icon: Users },
  { title: "Audit Log", url: "/audit-log", icon: ScrollText },
  { title: "Settings", url: "/settings", icon: Settings },
]

export function AppSidebar() {
  const { toggleSidebar } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b h-14 px-3 !flex-row items-center">
        {/* Expanded: title + collapse chevron */}
        <div className="flex flex-1 items-center gap-2 overflow-hidden group-data-[collapsible=icon]:hidden">
          <span className="text-lg font-semibold truncate">Asset Manager</span>
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

        {/* Collapsed: AM badge + expand chevron */}
        <div className="hidden flex-col items-center gap-1 group-data-[collapsible=icon]:flex">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleSidebar}
                className="size-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                AM
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
