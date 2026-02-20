import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import type { SortingState, VisibilityState } from "@tanstack/react-table";
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
import { useSavedViews } from "../hooks/use-saved-views";
import type { SavedView, ViewConfiguration } from "../types/saved-view";
import { ActiveFilterChips } from "../components/filters/active-filter-chips";
import type { ActiveFilter } from "../components/filters/active-filter-chips";

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
  const dateFromParam = searchParams.get("dateFrom") ?? "";
  const dateToParam = searchParams.get("dateTo") ?? "";

  const [searchInput, setSearchInput] = useState(searchParam);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Saved views
  const { data: savedViews = [] } = useSavedViews("audit-log");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const defaultViewApplied = useRef(false);

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

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        if (value) prev.set(key, value);
        else prev.delete(key);
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

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

  const sorting: SortingState = useMemo(
    () => [{ id: sortByParam, desc: sortDirParam === "desc" }],
    [sortByParam, sortDirParam],
  );

  const applyView = useCallback((view: SavedView) => {
    try {
      const config: ViewConfiguration = JSON.parse(view.configuration);
      setColumnVisibility(config.columnVisibility ?? {});
      setActiveViewId(view.id);
      setSearchParams((prev) => {
        if (config.sortBy) prev.set("sortBy", config.sortBy);
        if (config.sortDir) prev.set("sortDir", config.sortDir);
        if (config.search) { prev.set("search", config.search); setSearchInput(config.search); }
        else { prev.delete("search"); setSearchInput(""); }
        if (config.pageSize) prev.set("pageSize", String(config.pageSize));

        // Restore advanced filters
        const filterKeys = ["dateFrom", "dateTo"];
        for (const key of filterKeys) {
          const val = config.filters?.[key];
          if (val) prev.set(key, val);
          else prev.delete(key);
        }

        prev.set("page", "1");
        return prev;
      });
    } catch { /* invalid config */ }
  }, [setSearchParams]);

  // Apply default saved view on first load
  useEffect(() => {
    if (defaultViewApplied.current || savedViews.length === 0) return;
    defaultViewApplied.current = true;
    const defaultView = savedViews.find((v) => v.isDefault);
    if (defaultView) applyView(defaultView);
  }, [savedViews, applyView]);

  function handleResetToDefault() {
    setColumnVisibility({});
    setActiveViewId(null);
    setSearchParams((prev) => {
      prev.delete("search");
      prev.delete("entityType");
      prev.delete("action");
      prev.delete("dateFrom");
      prev.delete("dateTo");
      prev.set("sortBy", "timestamp");
      prev.set("sortDir", "desc");
      prev.set("page", "1");
      return prev;
    });
    setSearchInput("");
  }


  const getCurrentConfiguration = useCallback((): ViewConfiguration => ({
    columnVisibility,
    sortBy: sortByParam,
    sortDir: sortDirParam,
    search: searchParam || undefined,
    pageSize,
    filters: {
      ...(dateFromParam ? { dateFrom: dateFromParam } : {}),
      ...(dateToParam ? { dateTo: dateToParam } : {}),
    },
  }), [columnVisibility, sortByParam, sortDirParam, searchParam, pageSize, dateFromParam, dateToParam]);

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
        breadcrumbs={[{ label: "Tools", href: "/audit-log" }, { label: "Audit Log" }]}
        description="View all actions performed across the system."
        actions={
          !isLoading && (
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {totalCount}
            </span>
          )
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
            <div className="flex items-center gap-2">
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
              <ExportButton onExport={handleExport} loading={exporting} />
              <SavedViewSelector
                entityType="audit-log"
                activeViewId={activeViewId}
                onApplyView={applyView}
                onResetToDefault={handleResetToDefault}
                getCurrentConfiguration={getCurrentConfiguration}
              />
            </div>
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
