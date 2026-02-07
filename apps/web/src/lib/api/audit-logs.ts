import { apiClient } from "../api-client";
import type { AuditLogEntry } from "../../types/audit-log";

export interface AuditLogParams {
  entityType?: string;
  action?: string;
  search?: string;
}

export const auditLogsApi = {
  getAll(params?: AuditLogParams): Promise<AuditLogEntry[]> {
    const searchParams = new URLSearchParams();
    if (params?.entityType) searchParams.set("entityType", params.entityType);
    if (params?.action) searchParams.set("action", params.action);
    if (params?.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    return apiClient.get<AuditLogEntry[]>(`/auditlogs${qs ? `?${qs}` : ""}`);
  },
};
