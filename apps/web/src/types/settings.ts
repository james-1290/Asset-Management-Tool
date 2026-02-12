export interface SystemSettings {
  orgName: string;
  currency: string;
  dateFormat: string;
  defaultPageSize: number;
}

export interface AlertSettings {
  warrantyEnabled: boolean;
  certificateEnabled: boolean;
  licenceEnabled: boolean;
  thresholds: string;
  emailProvider: string;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpFromAddress: string;
  graphTenantId: string;
  graphClientId: string;
  graphClientSecret: string;
  graphFromAddress: string;
  slackWebhookUrl: string;
  recipients: string;
  scheduleType: string;
  scheduleTime: string;
  scheduleDay: string;
}

export interface AlertRunResult {
  runId: string;
  totalAlertsSent: number;
  warrantyAlerts: number;
  certificateAlerts: number;
  licenceAlerts: number;
  recipients: string[];
  timestamp: string;
}

export interface TestEmailResponse {
  success: boolean;
  message: string;
}

export interface AlertHistoryItem {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string;
  thresholdDays: number;
  expiryDate: string;
  sentAt: string;
  runId: string;
  recipients: string;
}

export interface AlertHistoryPage {
  items: AlertHistoryItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface UserDetail {
  id: string;
  username: string;
  displayName: string;
  email: string;
  isActive: boolean;
  roles: string[];
  createdAt: string;
  authProvider?: string;
}

export interface CreateUserRequest {
  username: string;
  displayName: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateUserRequest {
  displayName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface RoleOption {
  id: string;
  name: string;
  description: string | null;
}
