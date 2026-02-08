import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "../lib/api/settings";
import type { SystemSettings, AlertSettings } from "../types/settings";

const settingsKeys = {
  system: ["settings", "system"] as const,
  alerts: ["settings", "alerts"] as const,
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
