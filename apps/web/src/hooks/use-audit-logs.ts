import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { auditLogsApi, type AuditLogQueryParams } from "../lib/api/audit-logs";

const auditLogKeys = {
  paged: (params: AuditLogQueryParams) => ["audit-logs", "paged", params] as const,
};

export function usePagedAuditLogs(params: AuditLogQueryParams) {
  return useQuery({
    queryKey: auditLogKeys.paged(params),
    queryFn: () => auditLogsApi.getPaged(params),
    placeholderData: keepPreviousData,
  });
}
