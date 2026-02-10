import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../lib/api/reports";

const reportKeys = {
  assetSummary: ["reports", "asset-summary"] as const,
  expiries: (days: number) => ["reports", "expiries", days] as const,
  licenceSummary: ["reports", "licence-summary"] as const,
  assignments: ["reports", "assignments"] as const,
  assetLifecycle: ["reports", "asset-lifecycle"] as const,
};

export function useAssetSummaryReport(enabled: boolean = true) {
  return useQuery({
    queryKey: reportKeys.assetSummary,
    queryFn: reportsApi.getAssetSummary,
    staleTime: 60_000,
    enabled,
  });
}

export function useExpiriesReport(days: number = 30, enabled: boolean = true) {
  return useQuery({
    queryKey: reportKeys.expiries(days),
    queryFn: () => reportsApi.getExpiries(days),
    staleTime: 60_000,
    enabled,
  });
}

export function useLicenceSummaryReport(enabled: boolean = true) {
  return useQuery({
    queryKey: reportKeys.licenceSummary,
    queryFn: reportsApi.getLicenceSummary,
    staleTime: 60_000,
    enabled,
  });
}

export function useAssignmentsReport(enabled: boolean = true) {
  return useQuery({
    queryKey: reportKeys.assignments,
    queryFn: reportsApi.getAssignments,
    staleTime: 60_000,
    enabled,
  });
}

export function useAssetLifecycleReport(enabled: boolean = true) {
  return useQuery({
    queryKey: reportKeys.assetLifecycle,
    queryFn: reportsApi.getAssetLifecycle,
    staleTime: 60_000,
    enabled,
  });
}
