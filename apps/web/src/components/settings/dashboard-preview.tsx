import {
  Package,
  PoundSterling,
  ArrowRightLeft,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { ExpiringItemsTable } from "@/components/dashboard/expiring-items-table";
import { StatusBreakdownChart } from "@/components/dashboard/status-breakdown-chart";
import { AssetsByTypeChart } from "@/components/dashboard/assets-by-type-chart";
import { AssetsByLocationChart } from "@/components/dashboard/assets-by-location-chart";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { AssetsByAgeChart } from "@/components/dashboard/assets-by-age-chart";
import { ValueByLocationChart } from "@/components/dashboard/value-by-location-chart";
import { InventorySnapshot } from "@/components/dashboard/inventory-snapshot";
import {
  useDashboardSummary,
  useStatusBreakdown,
  useWarrantyExpiries,
  useAssetsByType,
  useAssetsByLocation,
  useCheckedOutAssets,
  useRecentActivity,
  useAssetsByAge,
  useValueByLocation,
  useCertificateExpiries,
  useLicenceExpiries,
  useInventorySnapshot,
} from "@/hooks/use-dashboard";
import type { WidgetId } from "@/lib/dashboard-preferences";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `£${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `£${(value / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface DashboardPreviewProps {
  isVisible: (id: WidgetId) => boolean;
}

export function DashboardPreview({ isVisible }: DashboardPreviewProps) {
  const summary = useDashboardSummary(true);
  const statusBreakdown = useStatusBreakdown(true);
  const warrantyExpiries = useWarrantyExpiries(30, true);
  const assetsByType = useAssetsByType(isVisible("assetsByType"));
  const assetsByLocation = useAssetsByLocation(isVisible("assetsByLocation"));
  const checkedOut = useCheckedOutAssets(true);
  const recentActivity = useRecentActivity(10, isVisible("recentActivity"));
  const assetsByAge = useAssetsByAge(isVisible("assetsByAge"));
  const valueByLocation = useValueByLocation(isVisible("valueByLocation"));
  const certificateExpiries = useCertificateExpiries(30, true);
  const licenceExpiries = useLicenceExpiries(30, true);
  const inventorySnapshot = useInventorySnapshot(isVisible("inventorySnapshot"));

  const maintenanceCount =
    statusBreakdown.data
      ?.filter((s) => s.status === "InRepair" || s.status === "InMaintenance")
      .reduce((sum, s) => sum + s.count, 0) ?? 0;

  const expiringSoonCount =
    (warrantyExpiries.data?.length ?? 0) +
    (certificateExpiries.data?.length ?? 0) +
    (licenceExpiries.data?.length ?? 0);

  const expiriesLoading =
    warrantyExpiries.isLoading ||
    certificateExpiries.isLoading ||
    licenceExpiries.isLoading;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          title="Total Assets"
          value={summary.data?.totalAssets?.toString() ?? "0"}
          icon={Package}
          iconBg="bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
          isLoading={summary.isLoading}
        />
        <StatCard
          title="Total Value"
          value={formatCurrency(summary.data?.totalValue ?? 0)}
          icon={PoundSterling}
          iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
          isLoading={summary.isLoading}
        />
        <StatCard
          title="Checked Out"
          value={checkedOut.data?.length?.toString() ?? "0"}
          icon={ArrowRightLeft}
          iconBg="bg-green-50 text-green-600 dark:bg-green-900/40 dark:text-green-400"
          isLoading={checkedOut.isLoading}
        />
        <StatCard
          title="In Maintenance"
          value={maintenanceCount.toString()}
          icon={Wrench}
          iconBg="bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
          isLoading={statusBreakdown.isLoading}
        />
        <StatCard
          title="Expiring Soon"
          value={expiringSoonCount.toString()}
          icon={AlertTriangle}
          iconBg="bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-400"
          isLoading={expiriesLoading}
          variant="attention"
        />
      </div>

      {isVisible("inventorySnapshot") && (
        <InventorySnapshot
          data={inventorySnapshot.data}
          isLoading={inventorySnapshot.isLoading}
        />
      )}

      {(isVisible("statusBreakdown") || isVisible("recentActivity")) && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {isVisible("statusBreakdown") && (
            <div className="lg:col-span-3">
              <StatusBreakdownChart
                data={statusBreakdown.data}
                isLoading={statusBreakdown.isLoading}
              />
            </div>
          )}
          {isVisible("recentActivity") && (
            <div className="lg:col-span-2">
              <RecentActivityList
                data={recentActivity.data}
                isLoading={recentActivity.isLoading}
              />
            </div>
          )}
        </div>
      )}

      {isVisible("expiringItems") && <ExpiringItemsTable />}

      {(isVisible("assetsByType") || isVisible("assetsByLocation")) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {isVisible("assetsByType") && (
            <div className="min-h-[280px]">
              <AssetsByTypeChart
                data={assetsByType.data}
                isLoading={assetsByType.isLoading}
              />
            </div>
          )}
          {isVisible("assetsByLocation") && (
            <div className="min-h-[280px]">
              <AssetsByLocationChart
                data={assetsByLocation.data}
                isLoading={assetsByLocation.isLoading}
              />
            </div>
          )}
        </div>
      )}

      {(isVisible("assetsByAge") || isVisible("valueByLocation")) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {isVisible("assetsByAge") && (
            <div className="min-h-[280px]">
              <AssetsByAgeChart
                data={assetsByAge.data}
                isLoading={assetsByAge.isLoading}
              />
            </div>
          )}
          {isVisible("valueByLocation") && (
            <div className="min-h-[280px]">
              <ValueByLocationChart
                data={valueByLocation.data}
                isLoading={valueByLocation.isLoading}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
