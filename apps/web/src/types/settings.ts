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
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpFromAddress: string;
  slackWebhookUrl: string;
  recipients: string;
}

export interface UserDetail {
  id: string;
  username: string;
  displayName: string;
  email: string;
  isActive: boolean;
  roles: string[];
  createdAt: string;
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
