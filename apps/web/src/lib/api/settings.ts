import { apiClient } from "../api-client";
import type { SystemSettings, AlertSettings } from "../../types/settings";

export const settingsApi = {
  getSystem(): Promise<SystemSettings> {
    return apiClient.get<SystemSettings>("/settings/system");
  },

  updateSystem(data: SystemSettings): Promise<SystemSettings> {
    return apiClient.put<SystemSettings>("/settings/system", data);
  },

  getAlerts(): Promise<AlertSettings> {
    return apiClient.get<AlertSettings>("/settings/alerts");
  },

  updateAlerts(data: AlertSettings): Promise<AlertSettings> {
    return apiClient.put<AlertSettings>("/settings/alerts", data);
  },
};
