import {
  Package,
  PoundSterling,
  TrendingDown,
  PackagePlus,
  PackageX,
  ArrowRightLeft,
  ShieldAlert,
  FileWarning,
  KeyRound,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { AttentionStrip } from "@/components/dashboard/attention-strip";
import { StatusBreakdownChart } from "@/components/dashboard/status-breakdown-chart";
import { AssetsByTypeChart } from "@/components/dashboard/assets-by-type-chart";
import { AssetsByLocationChart } from "@/components/dashboard/assets-by-location-chart";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { AssetsByAgeChart } from "@/components/dashboard/assets-by-age-chart";
import { ValueByLocationChart } from "@/components/dashboard/value-by-location-chart";
import { InventorySnapshot } from "@/components/dashboard/inventory-snapshot";
import { WidgetSettingsPopover } from "@/components/dashboard/widget-settings-popover";
import {
  useDashboardSummary,
  useStatusBreakdown,
  useWarrantyExpiries,
  useAssetsByType,
  useAssetsByLocation,
  useCheckedOutAssets,
  useRecentActivity,
  useRecentlyAdded,
  useAssetsByAge,
  useUnassignedAssets,
  useValueByLocation,
  useCertificateExpiries,
  useLicenceExpiries,
  useInventorySnapshot,
} from "@/hooks/use-dashboard";
import { useDashboardPreferences } from "@/hooks/use-dashboard-preferences";

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

function daysAgoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const { isVisible, toggleWidget } = useDashboardPreferences();

  const summary = useDashboardSummary(true);
  const statusBreakdown = useStatusBreakdown(isVisible("statusBreakdown"));
  const warrantyExpiries = useWarrantyExpiries(30, true);
  const assetsByType = useAssetsByType(isVisible("assetsByType"));
  const assetsByLocation = useAssetsByLocation(isVisible("assetsByLocation"));
  const checkedOut = useCheckedOutAssets(isVisible("checkedOut"));
  const recentActivity = useRecentActivity(10, isVisible("recentActivity"));
  const recentlyAdded = useRecentlyAdded(7, isVisible("recentlyAdded"));
  const assetsByAge = useAssetsByAge(isVisible("assetsByAge"));
  const unassignedAssets = useUnassignedAssets(isVisible("unassignedAssets"));
  const valueByLocation = useValueByLocation(isVisible("valueByLocation"));
  const certificateExpiries = useCertificateExpiries(30, true);
  const licenceExpiries = useLicenceExpiries(30, true);
  const inventorySnapshot = useInventorySnapshot(isVisible("inventorySnapshot"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        actions={
          <WidgetSettingsPopover
            isVisible={isVisible}
            toggleWidget={toggleWidget}
          />
        }
      />

      {/* Attention strip — surfaces what needs action */}
      <AttentionStrip
        warrantyCount={warrantyExpiries.data?.length ?? 0}
        certificateCount={certificateExpiries.data?.length ?? 0}
        licenceCount={licenceExpiries.data?.length ?? 0}
        isLoading={
          warrantyExpiries.isLoading ||
          certificateExpiries.isLoading ||
          licenceExpiries.isLoading
        }
      />

      {/* Key metrics — the numbers that matter */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {isVisible("totalAssets") && (
          <StatCard
            title="Total Assets"
            value={summary.data?.totalAssets?.toString() ?? "0"}
            icon={Package}
            isLoading={summary.isLoading}
            href="/assets"
          />
        )}
        {isVisible("totalValue") && (
          <StatCard
            title="Total Value"
            value={formatCurrency(summary.data?.totalValue ?? 0)}
            icon={PoundSterling}
            isLoading={summary.isLoading}
            href="/assets"
          />
        )}
        {isVisible("totalBookValue") && (
          <StatCard
            title="Book Value"
            value={formatCurrency(summary.data?.totalBookValue ?? 0)}
            icon={TrendingDown}
            isLoading={summary.isLoading}
            href="/assets"
          />
        )}
        {isVisible("checkedOut") && (
          <StatCard
            title="Checked Out"
            value={checkedOut.data?.length?.toString() ?? "0"}
            icon={ArrowRightLeft}
            isLoading={checkedOut.isLoading}
            href="/assets?status=CheckedOut"
          />
        )}
        {isVisible("unassignedAssets") && (
          <StatCard
            title="Unassigned"
            value={unassignedAssets.data?.length?.toString() ?? "0"}
            icon={PackageX}
            isLoading={unassignedAssets.isLoading}
            href="/assets?status=Available&unassigned=true"
          />
        )}
      </div>

      {/* Secondary metrics — operational */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isVisible("recentlyAdded") && (
          <StatCard
            title="Recently Added"
            value={recentlyAdded.data?.length?.toString() ?? "0"}
            icon={PackagePlus}
            isLoading={recentlyAdded.isLoading}
            href={`/assets?sortBy=createdAt&sortDir=desc&createdAfter=${daysAgoDate(7)}`}
          />
        )}
        {isVisible("warrantyExpiries") && (
          <StatCard
            title="Warranty Expiries"
            value={warrantyExpiries.data?.length?.toString() ?? "0"}
            icon={ShieldAlert}
            isLoading={warrantyExpiries.isLoading}
            href="/assets?sortBy=warrantyExpiryDate&sortDir=asc"
            variant="attention"
          />
        )}
        {isVisible("certificateExpiries") && (
          <StatCard
            title="Cert. Expiries"
            value={certificateExpiries.data?.length?.toString() ?? "0"}
            icon={FileWarning}
            isLoading={certificateExpiries.isLoading}
            href="/certificates?sortBy=expiryDate&sortDir=asc"
            variant="attention"
          />
        )}
        {isVisible("licenceExpiries") && (
          <StatCard
            title="Licence Expiries"
            value={licenceExpiries.data?.length?.toString() ?? "0"}
            icon={KeyRound}
            isLoading={licenceExpiries.isLoading}
            href="/applications?sortBy=expiryDate&sortDir=asc"
            variant="attention"
          />
        )}
      </div>

      {/* Inventory snapshot — spare counts, expiring, checked out, maintenance */}
      {isVisible("inventorySnapshot") && (
        <InventorySnapshot
          data={inventorySnapshot.data}
          isLoading={inventorySnapshot.isLoading}
        />
      )}

      {/* Primary content — status overview + activity feed */}
      {(isVisible("statusBreakdown") || isVisible("recentActivity")) && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {isVisible("statusBreakdown") && (
            <div className="lg:col-span-2 min-h-[360px]">
              <StatusBreakdownChart
                data={statusBreakdown.data}
                isLoading={statusBreakdown.isLoading}
              />
            </div>
          )}
          {isVisible("recentActivity") && (
            <div className="lg:col-span-3 min-h-[360px]">
              <RecentActivityList
                data={recentActivity.data}
                isLoading={recentActivity.isLoading}
              />
            </div>
          )}
        </div>
      )}

      {/* Charts — detailed breakdowns */}
      {(isVisible("assetsByType") || isVisible("assetsByLocation")) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {isVisible("assetsByType") && (
            <div className="min-h-[320px]">
              <AssetsByTypeChart
                data={assetsByType.data}
                isLoading={assetsByType.isLoading}
              />
            </div>
          )}
          {isVisible("assetsByLocation") && (
            <div className="min-h-[320px]">
              <AssetsByLocationChart
                data={assetsByLocation.data}
                isLoading={assetsByLocation.isLoading}
              />
            </div>
          )}
        </div>
      )}

      {(isVisible("assetsByAge") || isVisible("valueByLocation")) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {isVisible("assetsByAge") && (
            <div className="min-h-[320px]">
              <AssetsByAgeChart
                data={assetsByAge.data}
                isLoading={assetsByAge.isLoading}
              />
            </div>
          )}
          {isVisible("valueByLocation") && (
            <div className="min-h-[320px]">
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
