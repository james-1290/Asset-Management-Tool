import { apiClient } from "../api-client";
import type {
  AssetSummaryReport,
  ExpiriesReport,
  LicenceSummaryReport,
  AssignmentsReport,
  AssetLifecycleReport,
} from "../../types/report";

export const reportsApi = {
  getAssetSummary(): Promise<AssetSummaryReport> {
    return apiClient.get<AssetSummaryReport>("/reports/asset-summary");
  },

  getExpiries(days: number = 30): Promise<ExpiriesReport> {
    return apiClient.get<ExpiriesReport>(`/reports/expiries?days=${days}`);
  },

  getLicenceSummary(): Promise<LicenceSummaryReport> {
    return apiClient.get<LicenceSummaryReport>("/reports/licence-summary");
  },

  getAssignments(): Promise<AssignmentsReport> {
    return apiClient.get<AssignmentsReport>("/reports/assignments");
  },

  getAssetLifecycle(): Promise<AssetLifecycleReport> {
    return apiClient.get<AssetLifecycleReport>("/reports/asset-lifecycle");
  },

  downloadAssetSummaryCsv(): Promise<void> {
    return apiClient.downloadCsv("/reports/asset-summary?format=csv", undefined, "asset-summary-report.csv");
  },

  downloadExpiriesCsv(days: number = 30): Promise<void> {
    return apiClient.downloadCsv(`/reports/expiries?days=${days}&format=csv`, undefined, "expiries-report.csv");
  },

  downloadLicenceSummaryCsv(): Promise<void> {
    return apiClient.downloadCsv("/reports/licence-summary?format=csv", undefined, "licence-summary-report.csv");
  },

  downloadAssignmentsCsv(): Promise<void> {
    return apiClient.downloadCsv("/reports/assignments?format=csv", undefined, "assignments-report.csv");
  },

  downloadAssetLifecycleCsv(): Promise<void> {
    return apiClient.downloadCsv("/reports/asset-lifecycle?format=csv", undefined, "asset-lifecycle-report.csv");
  },
};
