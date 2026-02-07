import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Package, PoundSterling } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBreakdownChart } from "@/components/dashboard/status-breakdown-chart";
import { WarrantyExpiriesList } from "@/components/dashboard/warranty-expiries-list";
import { AssetsByTypeChart } from "@/components/dashboard/assets-by-type-chart";
import { AssetsByLocationChart } from "@/components/dashboard/assets-by-location-chart";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { CheckedOutList } from "@/components/dashboard/checked-out-list";
import { RecentlyAddedList } from "@/components/dashboard/recently-added-list";
import { AssetsByAgeChart } from "@/components/dashboard/assets-by-age-chart";
import { UnassignedAssetsList } from "@/components/dashboard/unassigned-assets-list";
import { ValueByLocationChart } from "@/components/dashboard/value-by-location-chart";
import { WidgetSettingsPopover } from "@/components/dashboard/widget-settings-popover";
import { SortableWidget } from "@/components/dashboard/sortable-widget";
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
} from "@/hooks/use-dashboard";
import { useDashboardPreferences } from "@/hooks/use-dashboard-preferences";
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
  const { prefs, isVisible, toggleWidget, reorderWidgets } =
    useDashboardPreferences();
  const [warrantyDays, setWarrantyDays] = useState(30);

  const summary = useDashboardSummary(isVisible("summary"));
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = prefs.visibleWidgets.indexOf(active.id as WidgetId);
      const newIndex = prefs.visibleWidgets.indexOf(over.id as WidgetId);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderWidgets(arrayMove(prefs.visibleWidgets, oldIndex, newIndex));
      }
    }
  }

  function renderWidget(id: WidgetId) {
    switch (id) {
      case "summary":
        return (
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
              icon={PoundSterling}
              isLoading={summary.isLoading}
            />
          </div>
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleWidgets} strategy={rectSortingStrategy}>
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleWidgets.map((id) => (
              <SortableWidget
                key={id}
                id={id}
                className={id === "summary" ? "lg:col-span-2" : ""}
              >
                {renderWidget(id)}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
