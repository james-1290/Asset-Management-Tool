import { useState, useCallback } from "react";
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
        const visible = prev.visibleWidgets.includes(id)
          ? prev.visibleWidgets.filter((w) => w !== id)
          : [...prev.visibleWidgets, id];
        const next = { ...prev, visibleWidgets: visible };
        preferencesStore.save(next);
        return next;
      });
    },
    []
  );

  const reorderWidgets = useCallback(
    (newOrder: WidgetId[]) => {
      setPrefs((prev) => {
        const next = { ...prev, visibleWidgets: newOrder };
        preferencesStore.save(next);
        return next;
      });
    },
    []
  );

  return { prefs, isVisible, toggleWidget, reorderWidgets };
}
