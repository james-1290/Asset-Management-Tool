import type { LayoutItem, ResponsiveLayouts, Layout } from "react-grid-layout";

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
  layouts: ResponsiveLayouts;
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

export const ALL_WIDGET_IDS: WidgetId[] = Object.keys(
  WIDGET_LABELS
) as WidgetId[];

export const STAT_CARD_WIDGET_IDS: WidgetId[] = [
  "totalAssets",
  "totalValue",
  "recentlyAdded",
  "unassignedAssets",
  "checkedOut",
  "warrantyExpiries",
  "certificateExpiries",
  "licenceExpiries",
  "totalBookValue",
];

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

export const WIDGET_MIN_SIZES: Record<WidgetId, { minW: number; minH: number; maxW?: number; maxH?: number }> = {
  totalAssets: { minW: 3, minH: 2, maxW: 3, maxH: 2 },
  totalValue: { minW: 3, minH: 2, maxW: 3, maxH: 2 },
  recentlyAdded: { minW: 3, minH: 2, maxW: 3, maxH: 2 },
  unassignedAssets: { minW: 3, minH: 2, maxW: 3, maxH: 2 },
  checkedOut: { minW: 3, minH: 2, maxW: 3, maxH: 2 },
  warrantyExpiries: { minW: 3, minH: 2, maxW: 3, maxH: 2 },
  certificateExpiries: { minW: 3, minH: 2, maxW: 3, maxH: 2 },
  licenceExpiries: { minW: 3, minH: 2, maxW: 3, maxH: 2 },
  totalBookValue: { minW: 3, minH: 2, maxW: 3, maxH: 2 },
  statusBreakdown: { minW: 4, minH: 4 },
  assetsByType: { minW: 4, minH: 4 },
  assetsByLocation: { minW: 4, minH: 4 },
  recentActivity: { minW: 3, minH: 3 },
  assetsByAge: { minW: 4, minH: 4 },
  valueByLocation: { minW: 4, minH: 4 },
  inventorySnapshot: { minW: 6, minH: 4 },
  expiringItems: { minW: 6, minH: 4 },
};

const DEFAULT_LG_LAYOUT: LayoutItem[] = [
  // Row 0: overview stats — what you have
  { i: "totalAssets", x: 0, y: 0, w: 3, h: 2 },
  { i: "totalValue", x: 3, y: 0, w: 3, h: 2 },
  { i: "totalBookValue", x: 6, y: 0, w: 3, h: 2 },
  { i: "recentlyAdded", x: 9, y: 0, w: 3, h: 2 },
  // Row 1: operational stats — what needs attention
  { i: "unassignedAssets", x: 0, y: 2, w: 3, h: 2 },
  { i: "checkedOut", x: 3, y: 2, w: 3, h: 2 },
  { i: "warrantyExpiries", x: 6, y: 2, w: 3, h: 2 },
  { i: "certificateExpiries", x: 9, y: 2, w: 3, h: 2 },
  // Row 2: licence expiries standalone
  { i: "licenceExpiries", x: 0, y: 4, w: 3, h: 2 },
  // Inventory snapshot
  { i: "inventorySnapshot", x: 3, y: 4, w: 9, h: 4 },
  // Primary charts: status + activity side by side (activity gets more height for scrolling)
  { i: "statusBreakdown", x: 0, y: 6, w: 5, h: 5 },
  { i: "recentActivity", x: 5, y: 6, w: 7, h: 5 },
  // Secondary charts
  { i: "assetsByType", x: 0, y: 11, w: 6, h: 5 },
  { i: "assetsByLocation", x: 6, y: 11, w: 6, h: 5 },
  { i: "assetsByAge", x: 0, y: 16, w: 6, h: 5 },
  { i: "valueByLocation", x: 6, y: 16, w: 6, h: 5 },
];

const DEFAULT_MD_LAYOUT: LayoutItem[] = [
  // Stat cards: 2 per row on medium
  { i: "totalAssets", x: 0, y: 0, w: 3, h: 2 },
  { i: "totalValue", x: 3, y: 0, w: 3, h: 2 },
  { i: "recentlyAdded", x: 0, y: 2, w: 3, h: 2 },
  { i: "unassignedAssets", x: 3, y: 2, w: 3, h: 2 },
  { i: "checkedOut", x: 0, y: 4, w: 3, h: 2 },
  { i: "warrantyExpiries", x: 3, y: 4, w: 3, h: 2 },
  { i: "certificateExpiries", x: 0, y: 6, w: 3, h: 2 },
  { i: "licenceExpiries", x: 3, y: 6, w: 3, h: 2 },
  { i: "totalBookValue", x: 0, y: 8, w: 3, h: 2 },
  { i: "inventorySnapshot", x: 0, y: 10, w: 6, h: 4 },
  // Charts: full width
  { i: "statusBreakdown", x: 0, y: 14, w: 6, h: 5 },
  { i: "assetsByType", x: 0, y: 13, w: 6, h: 5 },
  { i: "assetsByLocation", x: 0, y: 18, w: 6, h: 5 },
  { i: "assetsByAge", x: 0, y: 23, w: 6, h: 5 },
  { i: "valueByLocation", x: 0, y: 28, w: 6, h: 5 },
  { i: "recentActivity", x: 0, y: 33, w: 6, h: 5 },
];

const DEFAULT_SM_LAYOUT: LayoutItem[] = ALL_WIDGET_IDS.map((id, index) => ({
  i: id,
  x: 0,
  y: index * 2,
  w: 1,
  h: STAT_CARD_WIDGET_IDS.includes(id) ? 2 : 5,
}));

export const DEFAULT_LAYOUTS: ResponsiveLayouts = {
  lg: DEFAULT_LG_LAYOUT,
  md: DEFAULT_MD_LAYOUT,
  sm: DEFAULT_SM_LAYOUT,
};

function applyMinSizes(layout: Layout): LayoutItem[] {
  return layout.map((item) => {
    const sizes = WIDGET_MIN_SIZES[item.i as WidgetId];
    if (sizes) {
      const result: LayoutItem = { ...item, minW: sizes.minW, minH: sizes.minH };
      if (sizes.maxW !== undefined) result.maxW = sizes.maxW;
      if (sizes.maxH !== undefined) result.maxH = sizes.maxH;
      return result;
    }
    return { ...item };
  });
}

function defaultLayoutForWidget(id: WidgetId): { lg: LayoutItem; md: LayoutItem; sm: LayoutItem } {
  const lgItem = DEFAULT_LG_LAYOUT.find((l) => l.i === id);
  const mdItem = DEFAULT_MD_LAYOUT.find((l) => l.i === id);
  const smItem = DEFAULT_SM_LAYOUT.find((l) => l.i === id);
  return {
    lg: lgItem ?? { i: id, x: 0, y: 100, w: 6, h: 5 },
    md: mdItem ?? { i: id, x: 0, y: 100, w: 6, h: 5 },
    sm: smItem ?? { i: id, x: 0, y: 100, w: 1, h: 5 },
  };
}

/** Widgets shown by default — matches the mockup layout */
const DEFAULT_VISIBLE: WidgetId[] = [
  "statusBreakdown",
  "recentActivity",
  "expiringItems",
];

const DEFAULT_PREFERENCES: DashboardPreferences = {
  visibleWidgets: DEFAULT_VISIBLE,
  layouts: DEFAULT_LAYOUTS,
};

export const preferencesStore = {
  load(): DashboardPreferences {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_PREFERENCES;
      const parsed = JSON.parse(raw) as DashboardPreferences;
      if (!Array.isArray(parsed.visibleWidgets)) return DEFAULT_PREFERENCES;
      // Filter to only toggleable widget IDs that still exist
      const visibleWidgets = parsed.visibleWidgets.filter((id) =>
        TOGGLEABLE_WIDGET_IDS.includes(id)
      );
      const layouts: ResponsiveLayouts = parsed.layouts ?? DEFAULT_LAYOUTS;
      return { visibleWidgets, layouts };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },

  save(prefs: DashboardPreferences): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  },

  applyMinSizes,
  defaultLayoutForWidget,
};
