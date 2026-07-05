import { apiClient } from "../api-client";
import type {
  DashboardSummary,
  StatusBreakdownItem,
  WarrantyExpiryItem,
  AssetsByGroupItem,
  CheckedOutAsset,
  AssetsByAgeBucket,
  ValueByLocation,
  CertificateExpiryItem,
  LicenceExpiryItem,
  InventorySnapshotItem,
} from "../../types/dashboard";
import type { AuditLogEntry } from "../../types/audit-log";

export const dashboardApi = {
  getSummary(): Promise<DashboardSummary> {
    return apiClient.get<DashboardSummary>("/dashboard/summary");
  },

  getStatusBreakdown(): Promise<StatusBreakdownItem[]> {
    return apiClient.get<StatusBreakdownItem[]>("/dashboard/status-breakdown");
  },

  getWarrantyExpiries(days: number = 30): Promise<WarrantyExpiryItem[]> {
    return apiClient.get<WarrantyExpiryItem[]>(
      `/dashboard/warranty-expiries?days=${days}`
    );
  },

  getAssetsByType(): Promise<AssetsByGroupItem[]> {
    return apiClient.get<AssetsByGroupItem[]>("/dashboard/assets-by-type");
  },

  getAssetsByLocation(): Promise<AssetsByGroupItem[]> {
    return apiClient.get<AssetsByGroupItem[]>("/dashboard/assets-by-location");
  },

  getCheckedOut(): Promise<CheckedOutAsset[]> {
    return apiClient.get<CheckedOutAsset[]>("/dashboard/checked-out");
  },

  async getRecentActivity(limit: number = 10): Promise<AuditLogEntry[]> {
    // Fetch extra items to compensate for filtering, then trim to requested limit
    const result = await apiClient.get<{ items: AuditLogEntry[] }>(
      `/audit-logs?page=1&pageSize=${limit * 3}&sortBy=timestamp&sortDir=desc`
    );
    // Exclude user/auth events (logins, password changes, user updates) from dashboard activity
    const EXCLUDED_ENTITY_TYPES = new Set(["User"]);
    const EXCLUDED_ACTIONS = new Set(["Login", "LoginFailed", "PasswordChanged", "PasswordReset"]);
    return result.items
      .filter((e) => !EXCLUDED_ENTITY_TYPES.has(e.entityType) && !EXCLUDED_ACTIONS.has(e.action))
      .slice(0, limit);
  },

  getAssetsByAge(): Promise<AssetsByAgeBucket[]> {
    return apiClient.get<AssetsByAgeBucket[]>("/dashboard/assets-by-age");
  },

  getValueByLocation(): Promise<ValueByLocation[]> {
    return apiClient.get<ValueByLocation[]>("/dashboard/value-by-location");
  },

  getCertificateExpiries(days: number = 30): Promise<CertificateExpiryItem[]> {
    return apiClient.get<CertificateExpiryItem[]>(
      `/dashboard/certificate-expiries?days=${days}`
    );
  },

  getLicenceExpiries(days: number = 30): Promise<LicenceExpiryItem[]> {
    return apiClient.get<LicenceExpiryItem[]>(
      `/dashboard/licence-expiries?days=${days}`
    );
  },

  getInventorySnapshot(): Promise<InventorySnapshotItem[]> {
    return apiClient.get<InventorySnapshotItem[]>("/dashboard/inventory-snapshot");
  },
};
