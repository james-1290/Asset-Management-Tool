import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../lib/api/dashboard";

const dashboardKeys = {
  summary: ["dashboard", "summary"] as const,
  statusBreakdown: ["dashboard", "status-breakdown"] as const,
  warrantyExpiries: (days: number) =>
    ["dashboard", "warranty-expiries", days] as const,
  assetsByType: ["dashboard", "assets-by-type"] as const,
  assetsByLocation: ["dashboard", "assets-by-location"] as const,
  checkedOut: ["dashboard", "checked-out"] as const,
  recentActivity: (limit: number) =>
    ["dashboard", "recent-activity", limit] as const,
  recentlyAdded: (limit: number) =>
    ["dashboard", "recently-added", limit] as const,
  assetsByAge: ["dashboard", "assets-by-age"] as const,
  unassigned: ["dashboard", "unassigned"] as const,
  valueByLocation: ["dashboard", "value-by-location"] as const,
  certificateExpiries: (days: number) =>
    ["dashboard", "certificate-expiries", days] as const,
  certificateSummary: ["dashboard", "certificate-summary"] as const,
};

export function useDashboardSummary(enabled: boolean = true) {
  return useQuery({
    queryKey: dashboardKeys.summary,
    queryFn: dashboardApi.getSummary,
    staleTime: 60_000,
    enabled,
  });
}

export function useStatusBreakdown(enabled: boolean = true) {
  return useQuery({
    queryKey: dashboardKeys.statusBreakdown,
    queryFn: dashboardApi.getStatusBreakdown,
    staleTime: 60_000,
    enabled,
  });
}

export function useWarrantyExpiries(
  days: number = 30,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: dashboardKeys.warrantyExpiries(days),
    queryFn: () => dashboardApi.getWarrantyExpiries(days),
    staleTime: 60_000,
    enabled,
  });
}

export function useAssetsByType(enabled: boolean = true) {
  return useQuery({
    queryKey: dashboardKeys.assetsByType,
    queryFn: dashboardApi.getAssetsByType,
    staleTime: 60_000,
    enabled,
  });
}

export function useAssetsByLocation(enabled: boolean = true) {
  return useQuery({
    queryKey: dashboardKeys.assetsByLocation,
    queryFn: dashboardApi.getAssetsByLocation,
    staleTime: 60_000,
    enabled,
  });
}

export function useCheckedOutAssets(enabled: boolean = true) {
  return useQuery({
    queryKey: dashboardKeys.checkedOut,
    queryFn: dashboardApi.getCheckedOut,
    staleTime: 60_000,
    enabled,
  });
}

export function useRecentActivity(
  limit: number = 10,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: dashboardKeys.recentActivity(limit),
    queryFn: () => dashboardApi.getRecentActivity(limit),
    staleTime: 30_000,
    enabled,
  });
}

export function useRecentlyAdded(
  limit: number = 5,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: dashboardKeys.recentlyAdded(limit),
    queryFn: () => dashboardApi.getRecentlyAdded(limit),
    staleTime: 60_000,
    enabled,
  });
}

export function useAssetsByAge(enabled: boolean = true) {
  return useQuery({
    queryKey: dashboardKeys.assetsByAge,
    queryFn: dashboardApi.getAssetsByAge,
    staleTime: 60_000,
    enabled,
  });
}

export function useUnassignedAssets(enabled: boolean = true) {
  return useQuery({
    queryKey: dashboardKeys.unassigned,
    queryFn: dashboardApi.getUnassigned,
    staleTime: 60_000,
    enabled,
  });
}

export function useValueByLocation(enabled: boolean = true) {
  return useQuery({
    queryKey: dashboardKeys.valueByLocation,
    queryFn: dashboardApi.getValueByLocation,
    staleTime: 60_000,
    enabled,
  });
}

export function useCertificateExpiries(
  days: number = 30,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: dashboardKeys.certificateExpiries(days),
    queryFn: () => dashboardApi.getCertificateExpiries(days),
    staleTime: 60_000,
    enabled,
  });
}

export function useCertificateSummary(enabled: boolean = true) {
  return useQuery({
    queryKey: dashboardKeys.certificateSummary,
    queryFn: dashboardApi.getCertificateSummary,
    staleTime: 60_000,
    enabled,
  });
}
