import { apiClient } from "../api-client";
import type {
  DashboardSummary,
  StatusBreakdownItem,
  WarrantyExpiryItem,
  AssetsByGroupItem,
  CheckedOutAsset,
  RecentlyAddedAsset,
  AssetsByAgeBucket,
  UnassignedAsset,
  ValueByLocation,
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

  getRecentActivity(limit: number = 10): Promise<AuditLogEntry[]> {
    return apiClient.get<AuditLogEntry[]>(`/auditlogs?limit=${limit}`);
  },

  getRecentlyAdded(limit: number = 5): Promise<RecentlyAddedAsset[]> {
    return apiClient.get<RecentlyAddedAsset[]>(
      `/dashboard/recently-added?limit=${limit}`
    );
  },

  getAssetsByAge(): Promise<AssetsByAgeBucket[]> {
    return apiClient.get<AssetsByAgeBucket[]>("/dashboard/assets-by-age");
  },

  getUnassigned(): Promise<UnassignedAsset[]> {
    return apiClient.get<UnassignedAsset[]>("/dashboard/unassigned");
  },

  getValueByLocation(): Promise<ValueByLocation[]> {
    return apiClient.get<ValueByLocation[]>("/dashboard/value-by-location");
  },
};
