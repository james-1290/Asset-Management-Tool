import { useMemo } from "react";
import {
  ResponsiveGridLayout,
  useContainerWidth,
  verticalCompactor,
} from "react-grid-layout";
import type { Layout, ResponsiveLayouts } from "react-grid-layout";
import {
  Package,
  PoundSterling,
  PackagePlus,
  PackageX,
  ArrowRightLeft,
  ShieldAlert,
  FileWarning,
  KeyRound,
  TrendingDown,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBreakdownChart } from "@/components/dashboard/status-breakdown-chart";
import { AssetsByTypeChart } from "@/components/dashboard/assets-by-type-chart";
import { AssetsByLocationChart } from "@/components/dashboard/assets-by-location-chart";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { AssetsByAgeChart } from "@/components/dashboard/assets-by-age-chart";
import { ValueByLocationChart } from "@/components/dashboard/value-by-location-chart";
import { WidgetSettingsPopover } from "@/components/dashboard/widget-settings-popover";
import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
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
} from "@/hooks/use-dashboard";
import { useDashboardPreferences } from "@/hooks/use-dashboard-preferences";
import { preferencesStore } from "@/lib/dashboard-preferences";
import type { WidgetId } from "@/lib/dashboard-preferences";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardPage() {
  const { prefs, isVisible, toggleWidget, updateLayouts } =
    useDashboardPreferences();

  const { width, containerRef } = useContainerWidth();

  const summary = useDashboardSummary(
    isVisible("totalAssets") || isVisible("totalValue") || isVisible("totalBookValue")
  );
  const statusBreakdown = useStatusBreakdown(isVisible("statusBreakdown"));
  const warrantyExpiries = useWarrantyExpiries(
    30,
    isVisible("warrantyExpiries")
  );
  const assetsByType = useAssetsByType(isVisible("assetsByType"));
  const assetsByLocation = useAssetsByLocation(isVisible("assetsByLocation"));
  const checkedOut = useCheckedOutAssets(isVisible("checkedOut"));
  const recentActivity = useRecentActivity(10, isVisible("recentActivity"));
  const recentlyAdded = useRecentlyAdded(5, isVisible("recentlyAdded"));
  const assetsByAge = useAssetsByAge(isVisible("assetsByAge"));
  const unassignedAssets = useUnassignedAssets(isVisible("unassignedAssets"));
  const valueByLocation = useValueByLocation(isVisible("valueByLocation"));
  const certificateExpiries = useCertificateExpiries(
    30,
    isVisible("certificateExpiries")
  );
  const licenceExpiries = useLicenceExpiries(
    30,
    isVisible("licenceExpiries")
  );

  // Apply min sizes to all layouts for react-grid-layout constraints
  const layoutsWithMinSizes = useMemo(() => {
    const result: ResponsiveLayouts = {};
    for (const bp of Object.keys(prefs.layouts)) {
      result[bp] = preferencesStore.applyMinSizes(prefs.layouts[bp] ?? []);
    }
    return result;
  }, [prefs.layouts]);

  function handleLayoutChange(_current: Layout, allLayouts: ResponsiveLayouts) {
    updateLayouts(allLayouts);
  }

  function renderWidget(id: WidgetId) {
    switch (id) {
      case "totalAssets":
        return (
          <StatCard
            title="Total Assets"
            value={summary.data?.totalAssets?.toString() ?? "0"}
            icon={Package}
            isLoading={summary.isLoading}
            href="/assets"
            iconColor="bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-300"
          />
        );
      case "totalValue":
        return (
          <StatCard
            title="Total Value"
            value={formatCurrency(summary.data?.totalValue ?? 0)}
            icon={PoundSterling}
            isLoading={summary.isLoading}
            href="/assets"
            iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300"
          />
        );
      case "recentlyAdded":
        return (
          <StatCard
            title="Recently Added"
            value={recentlyAdded.data?.length?.toString() ?? "0"}
            icon={PackagePlus}
            isLoading={recentlyAdded.isLoading}
            href="/assets?sortBy=createdAt&sortDir=desc"
            iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
          />
        );
      case "unassignedAssets":
        return (
          <StatCard
            title="Unassigned"
            value={unassignedAssets.data?.length?.toString() ?? "0"}
            icon={PackageX}
            isLoading={unassignedAssets.isLoading}
            href="/assets?status=Available"
            iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300"
          />
        );
      case "checkedOut":
        return (
          <StatCard
            title="Checked Out"
            value={checkedOut.data?.length?.toString() ?? "0"}
            icon={ArrowRightLeft}
            isLoading={checkedOut.isLoading}
            href="/assets?status=CheckedOut"
            iconColor="bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300"
          />
        );
      case "warrantyExpiries":
        return (
          <StatCard
            title="Warranty Expiries"
            value={warrantyExpiries.data?.length?.toString() ?? "0"}
            icon={ShieldAlert}
            isLoading={warrantyExpiries.isLoading}
            href="/assets?sortBy=warrantyExpiryDate&sortDir=asc"
            iconColor="bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300"
          />
        );
      case "certificateExpiries":
        return (
          <StatCard
            title="Certificate Expiries"
            value={certificateExpiries.data?.length?.toString() ?? "0"}
            icon={FileWarning}
            isLoading={certificateExpiries.isLoading}
            href="/certificates?sortBy=expiryDate&sortDir=asc"
            iconColor="bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300"
          />
        );
      case "licenceExpiries":
        return (
          <StatCard
            title="Licence Expiries"
            value={licenceExpiries.data?.length?.toString() ?? "0"}
            icon={KeyRound}
            isLoading={licenceExpiries.isLoading}
            href="/applications?sortBy=expiryDate&sortDir=asc"
            iconColor="bg-cyan-100 text-cyan-600 dark:bg-cyan-900 dark:text-cyan-300"
          />
        );
      case "totalBookValue":
        return (
          <StatCard
            title="Total Book Value"
            value={formatCurrency(summary.data?.totalBookValue ?? 0)}
            icon={TrendingDown}
            isLoading={summary.isLoading}
            href="/assets"
            iconColor="bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-300"
          />
        );
      case "statusBreakdown":
        return (
          <StatusBreakdownChart
            data={statusBreakdown.data}
            isLoading={statusBreakdown.isLoading}
          />
        );
      case "assetsByType":
        return (
          <AssetsByTypeChart
            data={assetsByType.data}
            isLoading={assetsByType.isLoading}
          />
        );
      case "assetsByLocation":
        return (
          <AssetsByLocationChart
            data={assetsByLocation.data}
            isLoading={assetsByLocation.isLoading}
          />
        );
      case "recentActivity":
        return (
          <RecentActivityList
            data={recentActivity.data}
            isLoading={recentActivity.isLoading}
          />
        );
      case "assetsByAge":
        return (
          <AssetsByAgeChart
            data={assetsByAge.data}
            isLoading={assetsByAge.isLoading}
          />
        );
      case "valueByLocation":
        return (
          <ValueByLocationChart
            data={valueByLocation.data}
            isLoading={valueByLocation.isLoading}
          />
        );
    }
  }

  const visibleWidgets = prefs.visibleWidgets;

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

      <div ref={containerRef}>
        {width > 0 && (
          <ResponsiveGridLayout
            width={width}
            layouts={layoutsWithMinSizes}
            breakpoints={{ lg: 900, md: 600, sm: 0 }}
            cols={{ lg: 12, md: 6, sm: 1 }}
            rowHeight={60}
            margin={[16, 16]}
            onLayoutChange={handleLayoutChange}
            dragConfig={{ enabled: true, handle: ".drag-handle" }}
            resizeConfig={{ enabled: true }}
            compactor={verticalCompactor}
          >
            {visibleWidgets.map((id) => (
              <div key={id}>
                <DashboardWidget>{renderWidget(id)}</DashboardWidget>
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>
    </div>
  );
}
