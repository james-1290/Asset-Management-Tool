import { useState, useMemo } from "react";
import {
  ResponsiveGridLayout,
  useContainerWidth,
  verticalCompactor,
} from "react-grid-layout";
import type { Layout, ResponsiveLayouts } from "react-grid-layout";
import { Package, PoundSterling } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBreakdownChart } from "@/components/dashboard/status-breakdown-chart";
import { WarrantyExpiriesList } from "@/components/dashboard/warranty-expiries-list";
import { CertificateExpiriesList } from "@/components/dashboard/certificate-expiries-list";
import { AssetsByTypeChart } from "@/components/dashboard/assets-by-type-chart";
import { AssetsByLocationChart } from "@/components/dashboard/assets-by-location-chart";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { CheckedOutList } from "@/components/dashboard/checked-out-list";
import { RecentlyAddedList } from "@/components/dashboard/recently-added-list";
import { AssetsByAgeChart } from "@/components/dashboard/assets-by-age-chart";
import { UnassignedAssetsList } from "@/components/dashboard/unassigned-assets-list";
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
  const [warrantyDays, setWarrantyDays] = useState(30);
  const [certExpiryDays, setCertExpiryDays] = useState(30);

  const { width, containerRef } = useContainerWidth();

  const summary = useDashboardSummary(
    isVisible("totalAssets") || isVisible("totalValue")
  );
  const statusBreakdown = useStatusBreakdown(isVisible("statusBreakdown"));
  const warrantyExpiries = useWarrantyExpiries(
    warrantyDays,
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
    certExpiryDays,
    isVisible("certificateExpiries")
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
          />
        );
      case "totalValue":
        return (
          <StatCard
            title="Total Value"
            value={formatCurrency(summary.data?.totalValue ?? 0)}
            icon={PoundSterling}
            isLoading={summary.isLoading}
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
      case "warrantyExpiries":
        return (
          <WarrantyExpiriesList
            data={warrantyExpiries.data}
            isLoading={warrantyExpiries.isLoading}
            days={warrantyDays}
            onDaysChange={setWarrantyDays}
          />
        );
      case "recentActivity":
        return (
          <RecentActivityList
            data={recentActivity.data}
            isLoading={recentActivity.isLoading}
          />
        );
      case "checkedOut":
        return (
          <CheckedOutList
            data={checkedOut.data}
            isLoading={checkedOut.isLoading}
          />
        );
      case "recentlyAdded":
        return (
          <RecentlyAddedList
            data={recentlyAdded.data}
            isLoading={recentlyAdded.isLoading}
          />
        );
      case "assetsByAge":
        return (
          <AssetsByAgeChart
            data={assetsByAge.data}
            isLoading={assetsByAge.isLoading}
          />
        );
      case "unassignedAssets":
        return (
          <UnassignedAssetsList
            data={unassignedAssets.data}
            isLoading={unassignedAssets.isLoading}
          />
        );
      case "valueByLocation":
        return (
          <ValueByLocationChart
            data={valueByLocation.data}
            isLoading={valueByLocation.isLoading}
          />
        );
      case "certificateExpiries":
        return (
          <CertificateExpiriesList
            data={certificateExpiries.data}
            isLoading={certificateExpiries.isLoading}
            days={certExpiryDays}
            onDaysChange={setCertExpiryDays}
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
