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
  | "certificateExpiries";

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
};

export const ALL_WIDGET_IDS: WidgetId[] = Object.keys(
  WIDGET_LABELS
) as WidgetId[];

export const WIDGET_MIN_SIZES: Record<WidgetId, { minW: number; minH: number }> = {
  totalAssets: { minW: 3, minH: 2 },
  totalValue: { minW: 3, minH: 2 },
  statusBreakdown: { minW: 4, minH: 4 },
  warrantyExpiries: { minW: 3, minH: 3 },
  assetsByType: { minW: 4, minH: 4 },
  assetsByLocation: { minW: 4, minH: 4 },
  recentActivity: { minW: 3, minH: 3 },
  checkedOut: { minW: 3, minH: 3 },
  recentlyAdded: { minW: 3, minH: 3 },
  assetsByAge: { minW: 4, minH: 4 },
  unassignedAssets: { minW: 3, minH: 3 },
  valueByLocation: { minW: 4, minH: 4 },
  certificateExpiries: { minW: 3, minH: 3 },
};

const DEFAULT_LG_LAYOUT: LayoutItem[] = [
  { i: "totalAssets", x: 0, y: 0, w: 6, h: 2 },
  { i: "totalValue", x: 6, y: 0, w: 6, h: 2 },
  { i: "statusBreakdown", x: 0, y: 2, w: 6, h: 5 },
  { i: "warrantyExpiries", x: 6, y: 2, w: 6, h: 5 },
  { i: "assetsByType", x: 0, y: 7, w: 6, h: 5 },
  { i: "assetsByLocation", x: 6, y: 7, w: 6, h: 5 },
  { i: "recentActivity", x: 0, y: 12, w: 6, h: 5 },
  { i: "checkedOut", x: 6, y: 12, w: 6, h: 5 },
  { i: "recentlyAdded", x: 0, y: 17, w: 6, h: 5 },
  { i: "assetsByAge", x: 6, y: 17, w: 6, h: 5 },
  { i: "unassignedAssets", x: 0, y: 22, w: 6, h: 5 },
  { i: "valueByLocation", x: 6, y: 22, w: 6, h: 5 },
  { i: "certificateExpiries", x: 0, y: 27, w: 6, h: 5 },
];

const DEFAULT_MD_LAYOUT: LayoutItem[] = [
  { i: "totalAssets", x: 0, y: 0, w: 6, h: 2 },
  { i: "totalValue", x: 0, y: 2, w: 6, h: 2 },
  { i: "statusBreakdown", x: 0, y: 4, w: 6, h: 5 },
  { i: "warrantyExpiries", x: 0, y: 9, w: 6, h: 5 },
  { i: "assetsByType", x: 0, y: 12, w: 6, h: 5 },
  { i: "assetsByLocation", x: 0, y: 17, w: 6, h: 5 },
  { i: "recentActivity", x: 0, y: 22, w: 6, h: 5 },
  { i: "checkedOut", x: 0, y: 27, w: 6, h: 5 },
  { i: "recentlyAdded", x: 0, y: 32, w: 6, h: 5 },
  { i: "assetsByAge", x: 0, y: 37, w: 6, h: 5 },
  { i: "unassignedAssets", x: 0, y: 42, w: 6, h: 5 },
  { i: "valueByLocation", x: 0, y: 47, w: 6, h: 5 },
  { i: "certificateExpiries", x: 0, y: 52, w: 6, h: 5 },
];

const DEFAULT_SM_LAYOUT: LayoutItem[] = ALL_WIDGET_IDS.map((id, index) => ({
  i: id,
  x: 0,
  y: index * 5,
  w: 1,
  h: (id === "totalAssets" || id === "totalValue") ? 2 : 5,
}));

export const DEFAULT_LAYOUTS: ResponsiveLayouts = {
  lg: DEFAULT_LG_LAYOUT,
  md: DEFAULT_MD_LAYOUT,
  sm: DEFAULT_SM_LAYOUT,
};

function applyMinSizes(layout: Layout): LayoutItem[] {
  return layout.map((item) => {
    const mins = WIDGET_MIN_SIZES[item.i as WidgetId];
    if (mins) {
      return { ...item, minW: mins.minW, minH: mins.minH };
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
