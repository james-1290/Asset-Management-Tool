import { Package, DollarSign } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBreakdownChart } from "@/components/dashboard/status-breakdown-chart";
import { WarrantyExpiriesList } from "@/components/dashboard/warranty-expiries-list";
import { AssetsByTypeChart } from "@/components/dashboard/assets-by-type-chart";
import { AssetsByLocationChart } from "@/components/dashboard/assets-by-location-chart";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { CheckedOutList } from "@/components/dashboard/checked-out-list";
import { WidgetSettingsPopover } from "@/components/dashboard/widget-settings-popover";
import {
  useDashboardSummary,
  useStatusBreakdown,
  useWarrantyExpiries,
  useAssetsByType,
  useAssetsByLocation,
  useCheckedOutAssets,
  useRecentActivity,
} from "@/hooks/use-dashboard";
import { useDashboardPreferences } from "@/hooks/use-dashboard-preferences";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardPage() {
  const { isVisible, toggleWidget } = useDashboardPreferences();

  const summary = useDashboardSummary(isVisible("summary"));
  const statusBreakdown = useStatusBreakdown(isVisible("statusBreakdown"));
  const warrantyExpiries = useWarrantyExpiries(30, isVisible("warrantyExpiries"));
  const assetsByType = useAssetsByType(isVisible("assetsByType"));
  const assetsByLocation = useAssetsByLocation(isVisible("assetsByLocation"));
  const checkedOut = useCheckedOutAssets(isVisible("checkedOut"));
  const recentActivity = useRecentActivity(10, isVisible("recentActivity"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of assets, upcoming expiries, and quick stats."
        actions={
          <WidgetSettingsPopover
            isVisible={isVisible}
            toggleWidget={toggleWidget}
          />
        }
      />

      {isVisible("summary") && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Total Assets"
            value={summary.data?.totalAssets?.toString() ?? "0"}
            icon={Package}
            isLoading={summary.isLoading}
          />
          <StatCard
            title="Total Value"
            value={formatCurrency(summary.data?.totalValue ?? 0)}
            icon={DollarSign}
            isLoading={summary.isLoading}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {isVisible("statusBreakdown") && (
          <StatusBreakdownChart
            data={statusBreakdown.data}
            isLoading={statusBreakdown.isLoading}
          />
        )}
        {isVisible("assetsByType") && (
          <AssetsByTypeChart
            data={assetsByType.data}
            isLoading={assetsByType.isLoading}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {isVisible("assetsByLocation") && (
          <AssetsByLocationChart
            data={assetsByLocation.data}
            isLoading={assetsByLocation.isLoading}
          />
        )}
        {isVisible("warrantyExpiries") && (
          <WarrantyExpiriesList
            data={warrantyExpiries.data}
            isLoading={warrantyExpiries.isLoading}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {isVisible("recentActivity") && (
          <RecentActivityList
            data={recentActivity.data}
            isLoading={recentActivity.isLoading}
          />
        )}
        {isVisible("checkedOut") && (
          <CheckedOutList
            data={checkedOut.data}
            isLoading={checkedOut.isLoading}
          />
        )}
      </div>
    </div>
  );
}
