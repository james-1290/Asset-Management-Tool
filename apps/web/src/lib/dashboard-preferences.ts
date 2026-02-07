export type WidgetId =
  | "summary"
  | "statusBreakdown"
  | "warrantyExpiries"
  | "assetsByType"
  | "assetsByLocation"
  | "recentActivity"
  | "checkedOut";

export interface DashboardPreferences {
  visibleWidgets: WidgetId[];
}

const STORAGE_KEY = "dashboard-preferences";

const DEFAULT_PREFERENCES: DashboardPreferences = {
  visibleWidgets: [
    "summary",
    "statusBreakdown",
    "warrantyExpiries",
    "assetsByType",
    "assetsByLocation",
    "recentActivity",
    "checkedOut",
  ],
};

export const WIDGET_LABELS: Record<WidgetId, string> = {
  summary: "Summary Cards",
  statusBreakdown: "Status Breakdown",
  warrantyExpiries: "Warranty Expiries",
  assetsByType: "Assets by Type",
  assetsByLocation: "Assets by Location",
  recentActivity: "Recent Activity",
  checkedOut: "Checked Out Assets",
};

export const ALL_WIDGET_IDS: WidgetId[] = Object.keys(
  WIDGET_LABELS
) as WidgetId[];

export const preferencesStore = {
  load(): DashboardPreferences {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_PREFERENCES;
      const parsed = JSON.parse(raw) as DashboardPreferences;
      if (!Array.isArray(parsed.visibleWidgets)) return DEFAULT_PREFERENCES;
      return parsed;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },

  save(prefs: DashboardPreferences): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  },
};
