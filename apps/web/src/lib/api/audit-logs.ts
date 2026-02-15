import { apiClient } from "../api-client";
import type { AuditLogEntry } from "../../types/audit-log";
import type { PagedResponse } from "../../types/paged-response";

export interface AuditLogQueryParams {
  page?: number;
  pageSize?: number;
  entityType?: string;
  action?: string;
  search?: string;
  sortBy?: string;
  sortDir?: string;
  // Advanced filters
  dateFrom?: string;
  dateTo?: string;
}

export const auditLogsApi = {
  getPaged(params: AuditLogQueryParams): Promise<PagedResponse<AuditLogEntry>> {
    return apiClient.get<PagedResponse<AuditLogEntry>>("/auditlogs", params as Record<string, string | number | undefined>);
  },

  exportCsv(params: Omit<AuditLogQueryParams, "page" | "pageSize">): Promise<void> {
    return apiClient.downloadCsv("/auditlogs/export", params as Record<string, string | number | undefined>, "audit-log-export.csv");
  },
};
