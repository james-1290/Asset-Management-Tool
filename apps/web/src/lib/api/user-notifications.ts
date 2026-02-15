import { apiClient } from "../api-client";
import type {
  UserNotification,
  UserAlertRule,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  UnreadCountResponse,
} from "../../types/user-notification";
import type { PagedResponse } from "../../types/paged-response";

export interface UserNotificationQueryParams {
  page?: number;
  pageSize?: number;
  status?: "unread" | "read" | "all";
}

export const userNotificationsApi = {
  getAll(params: UserNotificationQueryParams): Promise<PagedResponse<UserNotification>> {
    return apiClient.get<PagedResponse<UserNotification>>(
      "/user-notifications",
      params as Record<string, string | number | undefined>
    );
  },

  getUnreadCount(): Promise<UnreadCountResponse> {
    return apiClient.get<UnreadCountResponse>("/user-notifications/unread-count");
  },

  markRead(id: string): Promise<UserNotification> {
    return apiClient.post<UserNotification>(`/user-notifications/${id}/read`, {});
  },

  dismiss(id: string): Promise<UserNotification> {
    return apiClient.post<UserNotification>(`/user-notifications/${id}/dismiss`, {});
  },

  snooze(id: string, duration: string): Promise<UserNotification> {
    return apiClient.post<UserNotification>(`/user-notifications/${id}/snooze`, { duration });
  },

  markAllRead(): Promise<{ marked: number }> {
    return apiClient.post<{ marked: number }>("/user-notifications/read-all", {});
  },
};

export const alertRulesApi = {
  getAll(): Promise<UserAlertRule[]> {
    return apiClient.get<UserAlertRule[]>("/alert-rules");
  },

  create(data: CreateAlertRuleRequest): Promise<UserAlertRule> {
    return apiClient.post<UserAlertRule>("/alert-rules", data);
  },

  update(id: string, data: UpdateAlertRuleRequest): Promise<UserAlertRule> {
    return apiClient.put<UserAlertRule>(`/alert-rules/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return apiClient.delete(`/alert-rules/${id}`);
  },
};
