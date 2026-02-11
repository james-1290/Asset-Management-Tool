import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, alertsApi } from "../lib/api/settings";
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.system });
    },
  });
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
