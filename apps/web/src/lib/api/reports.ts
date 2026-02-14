import { apiClient } from "../api-client";
import type {
  AssetSummaryReport,
  ExpiriesReport,
  LicenceSummaryReport,
  AssignmentsReport,
  AssetLifecycleReport,
} from "../../types/report";

function buildParams(entries: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(entries)) {
    if (val !== undefined && val !== null) {
      params.set(key, String(val));
    }
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}

export const reportsApi = {
  getAssetSummary(): Promise<AssetSummaryReport> {
    return apiClient.get<AssetSummaryReport>("/reports/asset-summary");
  },

  getExpiries(from?: string, to?: string, days?: number): Promise<ExpiriesReport> {
    return apiClient.get<ExpiriesReport>(`/reports/expiries${buildParams({ from, to, days })}`);
  },

  getLicenceSummary(from?: string, to?: string): Promise<LicenceSummaryReport> {
    return apiClient.get<LicenceSummaryReport>(`/reports/licence-summary${buildParams({ from, to })}`);
  },

  getAssignments(): Promise<AssignmentsReport> {
    return apiClient.get<AssignmentsReport>("/reports/assignments");
  },

  getAssetLifecycle(from?: string, to?: string): Promise<AssetLifecycleReport> {
    return apiClient.get<AssetLifecycleReport>(`/reports/asset-lifecycle${buildParams({ from, to })}`);
  },

  downloadAssetSummaryCsv(): Promise<void> {
    return apiClient.downloadCsv("/reports/asset-summary?format=csv", undefined, "asset-summary-report.csv");
  },

  downloadExpiriesCsv(from?: string, to?: string, days?: number): Promise<void> {
    const params = buildParams({ from, to, days, format: "csv" });
    return apiClient.downloadCsv(`/reports/expiries${params}`, undefined, "expiries-report.csv");
  },

  downloadLicenceSummaryCsv(from?: string, to?: string): Promise<void> {
    const params = buildParams({ from, to, format: "csv" });
    return apiClient.downloadCsv(`/reports/licence-summary${params}`, undefined, "licence-summary-report.csv");
  },

  downloadAssignmentsCsv(): Promise<void> {
    return apiClient.downloadCsv("/reports/assignments?format=csv", undefined, "assignments-report.csv");
  },

  downloadAssetLifecycleCsv(from?: string, to?: string): Promise<void> {
    const params = buildParams({ from, to, format: "csv" });
    return apiClient.downloadCsv(`/reports/asset-lifecycle${params}`, undefined, "asset-lifecycle-report.csv");
  },
};
