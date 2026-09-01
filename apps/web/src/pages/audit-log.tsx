import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { VisibilityState } from "@tanstack/react-table";
import { useListPage } from "../hooks/use-list-page";
import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { DataTablePagination } from "../components/data-table-pagination";
import { Skeleton } from "../components/ui/skeleton";
import { AuditLogsToolbar } from "../components/audit-logs/audit-logs-toolbar";
import { auditLogColumns } from "../components/audit-logs/columns";
import { usePagedAuditLogs } from "../hooks/use-audit-logs";
import { auditLogsApi } from "../lib/api/audit-logs";
import { ExportButton } from "../components/export-button";
import { SavedViewSelector } from "../components/saved-view-selector";
import { ActiveFilterChips } from "../components/filters/active-filter-chips";
import type { ActiveFilter } from "../components/filters/active-filter-chips";
import { useSavedViewState } from "../hooks/use-saved-view-state";

const SAVED_VIEW_FILTER_KEYS = ["entityType", "action", "dateFrom", "dateTo"] as const;

const SORT_FIELD_MAP: Record<string, string> = {
  timestamp: "timestamp",
  action: "action",
  entityType: "entitytype",
  entityName: "entityname",
  actorName: "actorname",
};

export default function AuditLogPage() {
  const {
    searchParams,
    setSearchParams,
    page,
    pageSize,
    searchParam,
    sortByParam,
    sortDirParam,
    searchInput,
    setSearchInput,
    sorting,
    handleSortingChange,
    handlePageChange,
    handlePageSizeChange,
    handleFilterChange,
  } = useListPage({ sortFieldMap: SORT_FIELD_MAP, defaultSortBy: "timestamp", defaultSortDir: "desc", defaultPageSize: 50 });
  const entityTypeParam = searchParams.get("entityType") ?? "";
  const actionParam = searchParams.get("action") ?? "";
  const dateFromParam = searchParams.get("dateFrom") ?? "";
  const dateToParam = searchParams.get("dateTo") ?? "";

  // Saved views
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      search: searchParam || undefined,
      entityType: entityTypeParam || undefined,
      action: actionParam || undefined,
      sortBy: sortByParam,
      sortDir: sortDirParam,
      dateFrom: dateFromParam || undefined,
      dateTo: dateToParam || undefined,
    }),
    [page, pageSize, searchParam, entityTypeParam, actionParam, sortByParam, sortDirParam, dateFromParam, dateToParam],
  );

  const { data: pagedResult, isLoading, isError } = usePagedAuditLogs(queryParams);

  // The saved-view plumbing every other list page uses. This page had its own
  // near-copy, which had already drifted: its reset cleared the entity-type and
  // action filters but a saved view never captured them, so applying a view left
  // whichever filters happened to be set.
  const { activeViewId, applyView, handleResetToDefault, getCurrentConfiguration } =
    useSavedViewState({
      entityType: "audit-log",
      filterKeys: SAVED_VIEW_FILTER_KEYS,
      defaultSortBy: "timestamp",
      defaultSortDir: "desc",
      searchParams,
      setSearchParams,
      setSearchInput,
      columnVisibility,
      setColumnVisibility,
      pageSize,
    });


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

  const activeFilters = useMemo(() => {
    const filters: ActiveFilter[] = [];
    if (dateFromParam || dateToParam) {
      filters.push({ key: "date", label: `Date: ${dateFromParam || "..."} \u2013 ${dateToParam || "..."}`, onRemove: () => { handleFilterChange("dateFrom", ""); handleFilterChange("dateTo", ""); } });
    }
    return filters;
  }, [dateFromParam, dateToParam, handleFilterChange]);

  const handleClearAllFilters = useCallback(() => {
    setSearchParams((prev) => {
      ["dateFrom", "dateTo"].forEach(k => prev.delete(k));
      prev.set("page", "1");
      return prev;
    });
  }, [setSearchParams]);

  const [exporting, setExporting] = useState(false);
  async function handleExport() {
    setExporting(true);
    try {
      await auditLogsApi.exportCsv({
        entityType: entityTypeParam || undefined,
        action: actionParam || undefined,
        search: searchParam || undefined,
        sortBy: sortByParam,
        sortDir: sortDirParam,
        dateFrom: dateFromParam || undefined,
        dateTo: dateToParam || undefined,
      });
    } catch {
      toast.error("Failed to export audit log");
    } finally {
      setExporting(false);
    }
  }

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
        breadcrumbs={[{ label: "Audit Log" }]}
        description="Monitor all administrative actions and system-level events."
        actions={
          <div className="flex items-center gap-3">
            <ExportButton onExport={handleExport} loading={exporting} />
            <SavedViewSelector
              entityType="audit-log"
              activeViewId={activeViewId}
              onApplyView={applyView}
              onResetToDefault={handleResetToDefault}
              getCurrentConfiguration={getCurrentConfiguration}
            />
          </div>
        }
      />

      <DataTable
        columns={auditLogColumns}
        data={pagedResult?.items ?? []}
        variant="borderless"
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        manualPagination
        manualSorting
        pageCount={pageCount}
        rowCount={totalCount}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        toolbar={(table) => (
          <div className="space-y-2">
            <AuditLogsToolbar
              table={table}
              search={searchInput}
              onSearchChange={setSearchInput}
              entityType={entityTypeParam}
              onEntityTypeChange={handleEntityTypeChange}
              action={actionParam}
              onActionChange={handleActionChange}
              dateFrom={dateFromParam}
              dateTo={dateToParam}
              onDateFromChange={(v) => handleFilterChange("dateFrom", v)}
              onDateToChange={(v) => handleFilterChange("dateTo", v)}
            />
            <ActiveFilterChips filters={activeFilters} onClearAll={handleClearAllFilters} />
          </div>
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
