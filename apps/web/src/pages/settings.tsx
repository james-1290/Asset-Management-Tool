import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/contexts/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "@/components/settings/profile-tab";
import { UsersTab } from "@/components/settings/users-tab";
import { AlertsTab } from "@/components/settings/alerts-tab";
import { SystemTab } from "@/components/settings/system-tab";

const TABS = ["profile", "users", "alerts", "system"] as const;
type TabValue = (typeof TABS)[number];

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAuth();

  const rawTab = searchParams.get("tab");
  const tab: TabValue =
    rawTab && TABS.includes(rawTab as TabValue) ? (rawTab as TabValue) : "profile";

  function handleTabChange(value: string) {
    setSearchParams({ tab: value }, { replace: true });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, users, alerts, and system settings."
      />

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
          {isAdmin && <TabsTrigger value="alerts">Alerts</TabsTrigger>}
          {isAdmin && <TabsTrigger value="system">System</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users" className="mt-6">
            <UsersTab />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="alerts" className="mt-6">
            <AlertsTab />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="system" className="mt-6">
            <SystemTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
