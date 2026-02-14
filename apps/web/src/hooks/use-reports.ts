import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../lib/api/reports";

const reportKeys = {
  assetSummary: ["reports", "asset-summary"] as const,
  expiries: (from?: string, to?: string, days?: number) =>
    ["reports", "expiries", from, to, days] as const,
  licenceSummary: (from?: string, to?: string) =>
    ["reports", "licence-summary", from, to] as const,
  assignments: ["reports", "assignments"] as const,
  assetLifecycle: (from?: string, to?: string) =>
    ["reports", "asset-lifecycle", from, to] as const,
};

export function useAssetSummaryReport(enabled: boolean = true) {
  return useQuery({
    queryKey: reportKeys.assetSummary,
    queryFn: reportsApi.getAssetSummary,
    staleTime: 60_000,
    enabled,
  });
}

export function useExpiriesReport(
  from?: string,
  to?: string,
  days?: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: reportKeys.expiries(from, to, days),
    queryFn: () => reportsApi.getExpiries(from, to, days),
    staleTime: 60_000,
    enabled,
  });
}

export function useLicenceSummaryReport(
  from?: string,
  to?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: reportKeys.licenceSummary(from, to),
    queryFn: () => reportsApi.getLicenceSummary(from, to),
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

export function useAssetLifecycleReport(
  from?: string,
  to?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: reportKeys.assetLifecycle(from, to),
    queryFn: () => reportsApi.getAssetLifecycle(from, to),
    staleTime: 60_000,
    enabled,
  });
}
