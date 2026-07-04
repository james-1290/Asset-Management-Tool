import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { settingsApi, alertsApi } from "../lib/api/settings";
import { setFormatSettings } from "../lib/format";
import type { SystemSettings, AlertSettings } from "../types/settings";

const settingsKeys = {
  system: ["settings", "system"] as const,
  alerts: ["settings", "alerts"] as const,
  alertHistory: ["alerts", "history"] as const,
};

export function useSystemSettings() {
  return useQuery({
    queryKey: settingsKeys.system,
    queryFn: settingsApi.getSystem,
  });
}

export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SystemSettings) => settingsApi.updateSystem(data),
    onSuccess: (data) => {
      // Apply the new date/currency format immediately, then refresh every
      // list/detail so already-rendered values reformat app-wide.
      setFormatSettings(data);
      queryClient.invalidateQueries({ queryKey: settingsKeys.system });
      queryClient.invalidateQueries();
    },
  });
}

/**
 * Loads the org's system settings and pushes date/currency format into the
 * shared formatting store. Mount once inside the authenticated shell so all
 * date/money rendering across the app honours the configured format.
 */
export function useFormatSettingsSync() {
  const { data } = useSystemSettings();
  useEffect(() => {
    if (data) setFormatSettings(data);
  }, [data]);
}

export function useAlertSettings() {
  return useQuery({
    queryKey: settingsKeys.alerts,
    queryFn: settingsApi.getAlerts,
  });
}

export function useUpdateAlertSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AlertSettings) => settingsApi.updateAlerts(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.alerts });
    },
  });
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: (recipient: string) => alertsApi.testEmail(recipient),
  });
}

export function useSendTestSlack() {
  return useMutation({
    mutationFn: () => alertsApi.testSlack(),
  });
}

export function useSendAlertsNow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => alertsApi.sendNow(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.alertHistory });
    },
  });
}

export function useAlertHistory(page = 0, size = 20) {
  return useQuery({
    queryKey: [...settingsKeys.alertHistory, page, size],
    queryFn: () => alertsApi.getHistory(page, size),
  });
}
