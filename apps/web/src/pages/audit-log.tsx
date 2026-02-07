import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { Skeleton } from "../components/ui/skeleton";
import { AuditLogsToolbar } from "../components/audit-logs/audit-logs-toolbar";
import { auditLogColumns } from "../components/audit-logs/columns";
import { useAuditLogs } from "../hooks/use-audit-logs";

export default function AuditLogPage() {
  const { data: logs, isLoading, isError } = useAuditLogs();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit Log" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit Log" />
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load audit logs. Is the API running?
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="View all actions performed across the system."
      />

      <DataTable
        columns={auditLogColumns}
        data={logs ?? []}
        toolbar={(table) => <AuditLogsToolbar table={table} />}
      />
    </div>
  );
}
