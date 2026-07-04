export type WidgetId =
  | "totalAssets"
  | "totalValue"
  | "statusBreakdown"
  | "warrantyExpiries"
  | "assetsByType"
  | "assetsByLocation"
  | "recentActivity"
  | "checkedOut"
  | "recentlyAdded"
  | "assetsByAge"
  | "unassignedAssets"
  | "valueByLocation"
  | "certificateExpiries"
  | "licenceExpiries"
  | "totalBookValue"
  | "inventorySnapshot"
  | "expiringItems";

export interface DashboardPreferences {
  visibleWidgets: WidgetId[];
}

const STORAGE_KEY = "dashboard-preferences";

export const WIDGET_LABELS: Record<WidgetId, string> = {
  totalAssets: "Total Assets",
  totalValue: "Total Value",
  statusBreakdown: "Status Breakdown",
  warrantyExpiries: "Warranty Expiries",
  assetsByType: "Assets by Type",
  assetsByLocation: "Assets by Location",
  recentActivity: "Recent Activity",
  checkedOut: "Checked Out Assets",
  recentlyAdded: "Recently Added",
  assetsByAge: "Assets by Age",
  unassignedAssets: "Unassigned Assets",
  valueByLocation: "Value by Location",
  certificateExpiries: "Certificate Expiries",
  licenceExpiries: "Licence Expiries",
  totalBookValue: "Total Book Value",
  inventorySnapshot: "Inventory Snapshot",
  expiringItems: "Expiring Items",
};

/** Widgets that can be toggled on/off via the settings popover */
export const TOGGLEABLE_WIDGET_IDS: WidgetId[] = [
  "statusBreakdown",
  "recentActivity",
  "expiringItems",
  "inventorySnapshot",
  "assetsByType",
  "assetsByLocation",
  "assetsByAge",
  "valueByLocation",
];

/** Widgets shown by default */
const DEFAULT_VISIBLE: WidgetId[] = [
  "statusBreakdown",
  "recentActivity",
  "expiringItems",
];

const DEFAULT_PREFERENCES: DashboardPreferences = {
  visibleWidgets: DEFAULT_VISIBLE,
};

export const preferencesStore = {
  load(): DashboardPreferences {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_PREFERENCES;
      const parsed = JSON.parse(raw) as { visibleWidgets?: unknown };
      if (!Array.isArray(parsed.visibleWidgets)) return DEFAULT_PREFERENCES;
      const visibleWidgets = (parsed.visibleWidgets as WidgetId[]).filter((id) =>
        TOGGLEABLE_WIDGET_IDS.includes(id)
      );
      return { visibleWidgets };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },

  save(prefs: DashboardPreferences): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  },
};
