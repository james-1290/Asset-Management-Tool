import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { ProfileTab } from "@/components/settings/profile-tab";
import { UsersTab } from "@/components/settings/users-tab";
import { AlertsTab } from "@/components/settings/alerts-tab";
import { SystemTab } from "@/components/settings/system-tab";
import { MyAlertsTab } from "@/components/settings/my-alerts-tab";
import { DashboardTab } from "@/components/settings/dashboard-tab";

const TABS: readonly { id: string; label: string; adminOnly?: boolean }[] = [
  { id: "profile", label: "Profile" },
  { id: "dashboard", label: "Dashboard" },
  { id: "my-alerts", label: "My Alerts" },
  { id: "users", label: "Users", adminOnly: true },
  { id: "alerts", label: "Alerts", adminOnly: true },
  { id: "system", label: "System", adminOnly: true },
];

type TabId = "profile" | "dashboard" | "my-alerts" | "users" | "alerts" | "system";

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAuth();

  const rawTab = searchParams.get("tab");
  const tab: TabId =
    rawTab && TABS.some((t) => t.id === rawTab) ? (rawTab as TabId) : "profile";

  function handleTabChange(value: string) {
    setSearchParams({ tab: value }, { replace: true });
  }

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="mb-0">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      {/* Underline tab navigation */}
      <div className="border-b border-border mt-4">
        <div className="flex gap-8">
          {TABS.map((t) => {
            if (t.adminOnly && !isAdmin) return null;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabChange(t.id)}
                className={[
                  "border-b-2 py-4 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-4xl pt-8">
        {tab === "profile" && <ProfileTab />}
        {tab === "dashboard" && <DashboardTab />}
        {tab === "my-alerts" && <MyAlertsTab />}
        {tab === "users" && isAdmin && <UsersTab />}
        {tab === "alerts" && isAdmin && <AlertsTab />}
        {tab === "system" && isAdmin && <SystemTab />}
      </div>
    </div>
  );
}
