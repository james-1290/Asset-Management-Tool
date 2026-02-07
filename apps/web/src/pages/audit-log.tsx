import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { SortingState } from "@tanstack/react-table";
import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { DataTablePagination } from "../components/data-table-pagination";
import { Skeleton } from "../components/ui/skeleton";
import { AuditLogsToolbar } from "../components/audit-logs/audit-logs-toolbar";
import { auditLogColumns } from "../components/audit-logs/columns";
import { usePagedAuditLogs } from "../hooks/use-audit-logs";

const SORT_FIELD_MAP: Record<string, string> = {
  timestamp: "timestamp",
  action: "action",
  entityType: "entitytype",
  entityName: "entityname",
  actorName: "actorname",
};

export default function AuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 25;
  const searchParam = searchParams.get("search") ?? "";
  const entityTypeParam = searchParams.get("entityType") ?? "";
  const actionParam = searchParams.get("action") ?? "";
  const sortByParam = searchParams.get("sortBy") ?? "timestamp";
  const sortDirParam = searchParams.get("sortDir") ?? "desc";

  const [searchInput, setSearchInput] = useState(searchParam);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams((prev) => {
        if (searchInput) {
          prev.set("search", searchInput);
        } else {
          prev.delete("search");
        }
        prev.set("page", "1");
        return prev;
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, setSearchParams]);

  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      search: searchParam || undefined,
      entityType: entityTypeParam || undefined,
      action: actionParam || undefined,
      sortBy: sortByParam,
      sortDir: sortDirParam,
    }),
    [page, pageSize, searchParam, entityTypeParam, actionParam, sortByParam, sortDirParam],
  );

  const { data: pagedResult, isLoading, isError } = usePagedAuditLogs(queryParams);

  const sorting: SortingState = useMemo(
    () => [{ id: sortByParam, desc: sortDirParam === "desc" }],
    [sortByParam, sortDirParam],
  );

  const handleSortingChange = useCallback(
    (updaterOrValue: SortingState | ((prev: SortingState) => SortingState)) => {
      const newSorting =
        typeof updaterOrValue === "function"
          ? updaterOrValue(sorting)
          : updaterOrValue;
      setSearchParams((prev) => {
        if (newSorting.length > 0) {
          const col = newSorting[0];
          const backendField = SORT_FIELD_MAP[col.id] ?? col.id;
          prev.set("sortBy", backendField);
          prev.set("sortDir", col.desc ? "desc" : "asc");
        } else {
          prev.delete("sortBy");
          prev.delete("sortDir");
        }
        prev.set("page", "1");
        return prev;
      });
    },
    [sorting, setSearchParams],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setSearchParams((prev) => {
        prev.set("page", String(newPage));
        return prev;
      });
    },
    [setSearchParams],
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      setSearchParams((prev) => {
        prev.set("pageSize", String(newPageSize));
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

  const handleEntityTypeChange = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        if (value === "all") {
          prev.delete("entityType");
        } else {
          prev.set("entityType", value);
        }
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

  const handleActionChange = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        if (value === "all") {
          prev.delete("action");
        } else {
          prev.set("action", value);
        }
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

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

  const totalCount = pagedResult?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="View all actions performed across the system."
      />

      <DataTable
        columns={auditLogColumns}
        data={pagedResult?.items ?? []}
        manualPagination
        manualSorting
        pageCount={pageCount}
        rowCount={totalCount}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        toolbar={(table) => (
          <AuditLogsToolbar
            table={table}
            search={searchInput}
            onSearchChange={setSearchInput}
            entityType={entityTypeParam}
            onEntityTypeChange={handleEntityTypeChange}
            action={actionParam}
            onActionChange={handleActionChange}
          />
        )}
        paginationControls={
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        }
      />
    </div>
  );
}
