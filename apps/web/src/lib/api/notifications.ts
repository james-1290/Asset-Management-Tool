import { apiClient } from "../api-client";

export interface NotificationItem {
  id: string;
  name: string;
  expiryDate: string;
}

export interface NotificationGroup {
  count: number;
  items: NotificationItem[];
}

export interface NotificationSummary {
  totalCount: number;
  warranties: NotificationGroup;
  certificates: NotificationGroup;
  licences: NotificationGroup;
}

export const notificationsApi = {
  getSummary(): Promise<NotificationSummary> {
    return apiClient.get<NotificationSummary>("/notifications/summary");
  },
};
