export interface UserNotification {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string;
  notificationType: "global" | "personal";
  title: string;
  message: string;
  thresholdDays: number;
  expiryDate: string;
  isRead: boolean;
  readAt: string | null;
  isDismissed: boolean;
  dismissedAt: string | null;
  snoozedUntil: string | null;
  createdAt: string;
}

export interface UserAlertRule {
  id: string;
  name: string;
  entityTypes: string;
  thresholds: string;
  conditions: string | null;
  notifyEmail: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertRuleRequest {
  name: string;
  entityTypes: string;
  thresholds: string;
  notifyEmail: boolean;
}

export interface UpdateAlertRuleRequest extends CreateAlertRuleRequest {
  isActive: boolean;
}

export interface UnreadCountResponse {
  count: number;
}
