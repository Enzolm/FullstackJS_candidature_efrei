import {
  Briefcase,
  ChartLine,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Sprout,
} from "lucide-react"
import { useNavigate } from "react-router"
import { useAuth } from "@/hooks/auth/useAuth"
import { ExtensionDownload } from "@/components/ExtensionDownload"

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
  {
    key: "documents",
    label: "Documents",
    icon: FolderOpen,
    path: "/documents",
  },
  { key: "analytics", label: "Analytics", icon: ChartLine, path: "/analytics" },
  { key: "jobs", label: "Jobs", icon: Search, path: "/jobs" },
] as const

type DashboardNavbarProps = {
  activeNav: string
  onActiveNavChange: (key: string) => void
  isSidebarOpen: boolean
  onSidebarOpenChange: (isOpen: boolean) => void
}

export function DashboardNavbar({
  activeNav,
  onActiveNavChange,
  isSidebarOpen,
  onSidebarOpenChange,
}: DashboardNavbarProps) {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const displayName =
    user?.profile?.firstName || user?.email.split("@")[0] || "Mon compte"
  const fullName = [user?.profile?.firstName, user?.profile?.lastName]
    .filter(Boolean)
    .join(" ")
  const displayRole = user?.profile?.searchDomain || "Profil candidat"

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <>
      <div className="fixed top-0 right-0 left-0 z-50 flex h-16 items-center justify-between bg-[#1e463e] px-4 text-[#f7f5f0] shadow-md lg:hidden">
        <div className="flex items-center gap-2 text-xl font-bold">
          <Sprout className="size-6 text-[#8da399]" />
          <span>TrackMyApply</span>
        </div>
        <button
          onClick={() => onSidebarOpenChange(!isSidebarOpen)}
          className="text-2xl"
          aria-label="Menu"
          type="button"
        >
          <LayoutDashboard className="size-6" />
        </button>
      </div>

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 transform flex-col bg-[#1e463e] pt-16 text-[#f7f5f0] transition-transform duration-300 lg:relative lg:translate-x-0 lg:pt-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="hidden h-20 items-center gap-3 border-b border-[#15332d]/40 px-8 text-2xl font-bold lg:flex">
          <Sprout className="size-7 text-[#8da399]" />
          <span>TrackMyApply</span>
        </div>

        <nav className="flex flex-1 flex-col gap-2 px-4 py-8">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = activeNav === item.key
            return (
              <button
                key={item.key}
                onClick={() => {
                  onActiveNavChange(item.key)
                  onSidebarOpenChange(false)
                  navigate(`${item.path}`)
                }}
                className={`flex items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all ${
                  active
                    ? "bg-[#15332d] text-white"
                    : "text-[#f7f5f0]/70 hover:bg-[#15332d] hover:text-white"
                }`}
                type="button"
              >
                <Icon className="size-5 shrink-0" />
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}

          <div className="mt-auto flex flex-col gap-2 border-t border-[#8da399]/20 pt-4">
            <ExtensionDownload compact />
            <button
              onClick={() => navigate("/settings")}
              className={`flex items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all ${
                activeNav === "settings"
                  ? "bg-[#15332d] text-white"
                  : "text-[#f7f5f0]/70 hover:bg-[#15332d] hover:text-white"
              }`}
              type="button"
            >
              <Settings className="size-5 shrink-0" />
              <span className="font-medium">Settings</span>
            </button>
          </div>
        </nav>

        <div className="border-t border-[#15332d]/40 p-4">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="flex size-10 items-center justify-center rounded-full border-2 border-[#8da399] bg-[#d96c4a] text-sm font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-bold text-white">
                {fullName || displayName}
              </span>
              <span className="text-xs text-[#f7f5f0]/60">{displayRole}</span>
              <span className="truncate text-[10px] text-[#f7f5f0]/50">
                {user?.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-[#f7f5f0]/60 hover:text-[#d96c4a]"
              aria-label="Déconnexion"
              type="button"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
