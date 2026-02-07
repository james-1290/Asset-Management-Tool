import { useState, useCallback } from "react";
import type { ResponsiveLayouts, Layout } from "react-grid-layout";
import {
  preferencesStore,
  type WidgetId,
  type DashboardPreferences,
} from "../lib/dashboard-preferences";

export function useDashboardPreferences() {
  const [prefs, setPrefs] = useState<DashboardPreferences>(() =>
    preferencesStore.load()
  );

  const isVisible = useCallback(
    (id: WidgetId) => prefs.visibleWidgets.includes(id),
    [prefs.visibleWidgets]
  );

  const toggleWidget = useCallback(
    (id: WidgetId) => {
      setPrefs((prev) => {
        const wasVisible = prev.visibleWidgets.includes(id);
        let visibleWidgets: WidgetId[];
        let layouts: ResponsiveLayouts;

        if (wasVisible) {
          // Remove from visible and strip from layouts
          visibleWidgets = prev.visibleWidgets.filter((w) => w !== id);
          layouts = {};
          for (const bp of Object.keys(prev.layouts)) {
            const bpLayout: Layout = prev.layouts[bp] ?? [];
            layouts[bp] = bpLayout.filter((l) => l.i !== id);
          }
        } else {
          // Add back with default position
          visibleWidgets = [...prev.visibleWidgets, id];
          const defaults = preferencesStore.defaultLayoutForWidget(id);
          layouts = {};
          for (const bp of Object.keys(prev.layouts)) {
            const bpLayout: Layout = prev.layouts[bp] ?? [];
            layouts[bp] = [
              ...bpLayout,
              defaults[bp as keyof typeof defaults] ?? { i: id, x: 0, y: 100, w: 6, h: 5 },
            ];
          }
        }

        const next: DashboardPreferences = { visibleWidgets, layouts };
        preferencesStore.save(next);
        return next;
      });
    },
    []
  );

  const updateLayouts = useCallback(
    (layouts: ResponsiveLayouts) => {
      setPrefs((prev) => {
        const next = { ...prev, layouts };
        preferencesStore.save(next);
        return next;
      });
    },
    []
  );

  return { prefs, isVisible, toggleWidget, updateLayouts };
}
