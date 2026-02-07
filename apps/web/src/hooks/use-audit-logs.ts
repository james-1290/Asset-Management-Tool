import { useQuery } from "@tanstack/react-query";
import { auditLogsApi, type AuditLogParams } from "../lib/api/audit-logs";

const auditLogKeys = {
  all: (params?: AuditLogParams) => ["audit-logs", params] as const,
};

export function useAuditLogs(params?: AuditLogParams) {
  return useQuery({
    queryKey: auditLogKeys.all(params),
    queryFn: () => auditLogsApi.getAll(params),
  });
}
