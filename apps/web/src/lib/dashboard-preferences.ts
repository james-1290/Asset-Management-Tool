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
  | "totalBookValue";

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
};

const DEFAULT_LG_LAYOUT: LayoutItem[] = [
  // Row 0: stat cards (4 across)
  { i: "totalAssets", x: 0, y: 0, w: 3, h: 2 },
  { i: "totalValue", x: 3, y: 0, w: 3, h: 2 },
  { i: "recentlyAdded", x: 6, y: 0, w: 3, h: 2 },
  { i: "unassignedAssets", x: 9, y: 0, w: 3, h: 2 },
  // Row 1: stat cards (4 across)
  { i: "totalBookValue", x: 0, y: 2, w: 3, h: 2 },
  { i: "checkedOut", x: 3, y: 2, w: 3, h: 2 },
  { i: "warrantyExpiries", x: 6, y: 2, w: 3, h: 2 },
  { i: "certificateExpiries", x: 9, y: 2, w: 3, h: 2 },
  // Row 2
  { i: "licenceExpiries", x: 0, y: 4, w: 3, h: 2 },
  // Charts
  { i: "statusBreakdown", x: 0, y: 6, w: 6, h: 5 },
  { i: "assetsByType", x: 6, y: 4, w: 6, h: 5 },
  { i: "assetsByLocation", x: 0, y: 9, w: 6, h: 5 },
  { i: "assetsByAge", x: 6, y: 9, w: 6, h: 5 },
  { i: "valueByLocation", x: 0, y: 14, w: 6, h: 5 },
  { i: "recentActivity", x: 6, y: 14, w: 6, h: 5 },
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
  // Charts: full width
  { i: "statusBreakdown", x: 0, y: 10, w: 6, h: 5 },
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

const DEFAULT_PREFERENCES: DashboardPreferences = {
  visibleWidgets: [...ALL_WIDGET_IDS],
  layouts: DEFAULT_LAYOUTS,
};

export const preferencesStore = {
  load(): DashboardPreferences {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_PREFERENCES;
      const parsed = JSON.parse(raw) as DashboardPreferences;
      if (!Array.isArray(parsed.visibleWidgets)) return DEFAULT_PREFERENCES;
      // Filter out any widget IDs that no longer exist
      const valid = parsed.visibleWidgets.filter((id) =>
        ALL_WIDGET_IDS.includes(id)
      );
      // Append any new widget IDs that weren't in the saved prefs
      const newIds = ALL_WIDGET_IDS.filter(
        (id) => !parsed.visibleWidgets.includes(id)
      );
      const visibleWidgets = [...valid, ...newIds];

      // Merge layouts — add missing widgets to each breakpoint
      let layouts: ResponsiveLayouts = parsed.layouts ?? DEFAULT_LAYOUTS;
      for (const bp of ["lg", "md", "sm"] as const) {
        const bpLayout = layouts[bp] ?? [];
        const existingIds = new Set(bpLayout.map((l) => l.i));
        const missing = newIds.filter((id) => !existingIds.has(id));
        if (missing.length > 0) {
          layouts = {
            ...layouts,
            [bp]: [
              ...bpLayout,
              ...missing.map((id) => defaultLayoutForWidget(id)[bp]),
            ],
          };
        }
      }

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
