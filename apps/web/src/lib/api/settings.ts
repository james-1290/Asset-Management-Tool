import { apiClient } from "../api-client";
import type {
  SystemSettings,
  AlertSettings,
  AlertRunResult,
  TestEmailResponse,
  AlertHistoryPage,
} from "../../types/settings";

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

export const alertsApi = {
  sendNow(): Promise<AlertRunResult> {
    return apiClient.post<AlertRunResult>("/alerts/send-now", {});
  },

  testEmail(recipient: string): Promise<TestEmailResponse> {
    return apiClient.post<TestEmailResponse>("/alerts/test-email", { recipient });
  },

  testSlack(): Promise<TestEmailResponse> {
    return apiClient.post<TestEmailResponse>("/alerts/test-slack", {});
  },

  getHistory(page = 0, size = 20): Promise<AlertHistoryPage> {
    return apiClient.get<AlertHistoryPage>(`/alerts/history?page=${page}&size=${size}`);
  },
};
