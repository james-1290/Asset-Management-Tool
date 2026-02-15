import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Archive, RefreshCw } from "lucide-react";
import type { SortingState, VisibilityState, RowSelectionState } from "@tanstack/react-table";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { DataTablePagination } from "../components/data-table-pagination";
import { applicationsApi } from "../lib/api/applications";
import { getApiErrorMessage } from "../lib/api-client";
import { ExportButton } from "../components/export-button";
import { ConfirmDialog } from "../components/confirm-dialog";
import { DeactivateApplicationDialog } from "../components/applications/deactivate-application-dialog";
import { ApplicationFormDialog } from "../components/applications/application-form-dialog";
import { ApplicationsToolbar } from "../components/applications/applications-toolbar";
import { getApplicationColumns } from "../components/applications/columns";
import { ViewModeToggle } from "../components/view-mode-toggle";
import { GroupedGridView } from "../components/grouped-grid-view";
import { ApplicationCard } from "../components/applications/application-card";
import {
  usePagedApplications,
  useCreateApplication,
  useUpdateApplication,
  useArchiveApplication,
  useDeactivateApplication,
  useBulkArchiveApplications,
  useBulkStatusApplications,
  useCheckApplicationDuplicates,
} from "../hooks/use-applications";
import { getSelectionColumn } from "../components/data-table-selection-column";
import { BulkActionBar } from "../components/bulk-action-bar";
import { useApplicationTypes } from "../hooks/use-application-types";
import { useLocations } from "../hooks/use-locations";
import type { Application } from "../types/application";
import type { ApplicationFormValues } from "../lib/schemas/application";
import { SavedViewSelector } from "../components/saved-view-selector";
import { useSavedViews } from "../hooks/use-saved-views";
import type { SavedView, ViewConfiguration } from "../types/saved-view";
import type { DuplicateCheckResult } from "../types/duplicate-check";
import { DuplicateWarningDialog } from "../components/shared/duplicate-warning-dialog";
import { ActiveFilterChips } from "../components/filters/active-filter-chips";
import type { ActiveFilter } from "../components/filters/active-filter-chips";

const SORT_FIELD_MAP: Record<string, string> = {
  name: "name",
  applicationTypeName: "applicationTypeName",
  publisher: "publisher",
  licenceType: "licenceType",
  expiryDate: "expiryDate",
  status: "status",
};

export default function ApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 25;
  const searchParam = searchParams.get("search") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const sortByParam = searchParams.get("sortBy") ?? "name";
  const sortDirParam = searchParams.get("sortDir") ?? "asc";
  const includeInactive = searchParams.get("includeInactive") === "true";
  const typeIdParam = searchParams.get("typeId") ?? "";
  const viewMode = (searchParams.get("viewMode") as "list" | "grouped") || "list";
  const expiryFromParam = searchParams.get("expiryFrom") ?? "";
  const expiryToParam = searchParams.get("expiryTo") ?? "";
  const licenceTypeParam = searchParams.get("licenceType") ?? "";
  const costMinParam = searchParams.get("costMin") ?? "";
  const costMaxParam = searchParams.get("costMax") ?? "";

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

  const handleStatusFilterChange = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        if (value) {
          prev.set("status", value);
        } else {
          prev.delete("status");
        }
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

  const handleIncludeInactiveChange = useCallback(
    (value: boolean) => {
      setSearchParams((prev) => {
        if (value) prev.set("includeInactive", "true");
        else prev.delete("includeInactive");
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

  const handleTypeIdChange = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        if (value) prev.set("typeId", value);
        else prev.delete("typeId");
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

  const handleViewModeChange = useCallback(
    (mode: "list" | "grouped") => {
      setSearchParams((prev) => {
        if (mode === "list") prev.delete("viewMode");
        else prev.set("viewMode", mode);
        return prev;
      });
    },
    [setSearchParams],
  );

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

  const includeStatuses = useMemo(() => {
    return includeInactive ? "Inactive" : undefined;
  }, [includeInactive]);

  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      search: searchParam || undefined,
      status: statusParam || undefined,
      includeStatuses,
      sortBy: sortByParam,
      sortDir: sortDirParam,
      typeId: typeIdParam || undefined,
      expiryFrom: expiryFromParam || undefined,
      expiryTo: expiryToParam || undefined,
      licenceType: licenceTypeParam || undefined,
      costMin: costMinParam || undefined,
      costMax: costMaxParam || undefined,
    }),
    [page, pageSize, searchParam, statusParam, includeStatuses, sortByParam, sortDirParam, typeIdParam, expiryFromParam, expiryToParam, licenceTypeParam, costMinParam, costMaxParam],
  );

  const { data: pagedResult, isLoading, isError } = usePagedApplications(queryParams);
  const { data: applicationTypes } = useApplicationTypes();
  const { data: locations } = useLocations();
  const createMutation = useCreateApplication();
  const checkDuplicatesMutation = useCheckApplicationDuplicates();
  const updateMutation = useUpdateApplication();
  const archiveMutation = useArchiveApplication();
  const deactivateMutation = useDeactivateApplication();
  const bulkArchiveMutation = useBulkArchiveApplications();
  const bulkStatusMutation = useBulkStatusApplications();

  const [formOpen, setFormOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [archivingApplication, setArchivingApplication] = useState<Application | null>(null);
  const [deactivatingApplication, setDeactivatingApplication] = useState<Application | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    duplicates: DuplicateCheckResult[];
    onConfirm: () => void;
  } | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);

  // Saved views
  const { data: savedViews = [] } = useSavedViews("applications");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const defaultViewApplied = useRef(false);

  const columns = useMemo(
    () => [
      getSelectionColumn<Application>(),
      ...getApplicationColumns({
        onEdit: (application) => {
          setEditingApplication(application);
          setFormOpen(true);
        },
        onArchive: (application) => {
          setArchivingApplication(application);
        },
        onDeactivate: (application) => {
          setDeactivatingApplication(application);
        },
      }),
    ],
    [],
  );

  const sorting: SortingState = useMemo(
    () => [{ id: sortByParam, desc: sortDirParam === "desc" }],
    [sortByParam, sortDirParam],
  );

  // Apply default saved view on first load
  useEffect(() => {
    if (defaultViewApplied.current || savedViews.length === 0) return;
    defaultViewApplied.current = true;
    const defaultView = savedViews.find((v) => v.isDefault);
    if (defaultView) applyView(defaultView);
  }, [savedViews]);

  function handleResetToDefault() {
    setColumnVisibility({});
    setActiveViewId(null);
    setSearchParams((prev) => {
      prev.delete("search");
      prev.delete("status");
      prev.delete("includeInactive");
      prev.delete("typeId");
      prev.delete("viewMode");
      prev.delete("expiryFrom");
      prev.delete("expiryTo");
      prev.delete("licenceType");
      prev.delete("costMin");
      prev.delete("costMax");
      prev.set("sortBy", "name");
      prev.set("sortDir", "asc");
      prev.set("page", "1");
      return prev;
    });
    setSearchInput("");
  }

  function applyView(view: SavedView) {
    try {
      const config: ViewConfiguration = JSON.parse(view.configuration);
      setColumnVisibility(config.columnVisibility ?? {});
      setActiveViewId(view.id);
      setSearchParams((prev) => {
        if (config.sortBy) prev.set("sortBy", config.sortBy);
        if (config.sortDir) prev.set("sortDir", config.sortDir);
        if (config.search) { prev.set("search", config.search); setSearchInput(config.search); }
        else { prev.delete("search"); setSearchInput(""); }
        if (config.status) prev.set("status", config.status);
        else prev.delete("status");
        if (config.typeId) prev.set("typeId", config.typeId);
        else prev.delete("typeId");
        if (config.viewMode && config.viewMode !== "list") prev.set("viewMode", config.viewMode);
        else prev.delete("viewMode");
        if (config.pageSize) prev.set("pageSize", String(config.pageSize));

        // Restore advanced filters
        const filterKeys = ["expiryFrom", "expiryTo", "licenceType", "costMin", "costMax"];
        for (const key of filterKeys) {
          const val = config.filters?.[key];
          if (val) prev.set(key, val);
          else prev.delete(key);
        }

        prev.set("page", "1");
        return prev;
      });
    } catch { /* invalid config */ }
  }

  const getCurrentConfiguration = useCallback((): ViewConfiguration => ({
    columnVisibility,
    sortBy: sortByParam,
    sortDir: sortDirParam,
    search: searchParam || undefined,
    status: statusParam || undefined,
    typeId: typeIdParam || undefined,
    viewMode: viewMode !== "list" ? viewMode : undefined,
    pageSize,
    filters: {
      ...(expiryFromParam ? { expiryFrom: expiryFromParam } : {}),
      ...(expiryToParam ? { expiryTo: expiryToParam } : {}),
      ...(licenceTypeParam ? { licenceType: licenceTypeParam } : {}),
      ...(costMinParam ? { costMin: costMinParam } : {}),
      ...(costMaxParam ? { costMax: costMaxParam } : {}),
    },
  }), [columnVisibility, sortByParam, sortDirParam, searchParam, statusParam, typeIdParam, viewMode, pageSize, expiryFromParam, expiryToParam, licenceTypeParam, costMinParam, costMaxParam]);

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

  const activeFilters = useMemo(() => {
    const filters: ActiveFilter[] = [];
    if (expiryFromParam || expiryToParam) {
      filters.push({ key: "expiry", label: `Expiry: ${expiryFromParam || "..."} \u2013 ${expiryToParam || "..."}`, onRemove: () => { handleFilterChange("expiryFrom", ""); handleFilterChange("expiryTo", ""); } });
    }
    if (licenceTypeParam) {
      filters.push({ key: "licenceType", label: `Licence: ${licenceTypeParam}`, onRemove: () => handleFilterChange("licenceType", "") });
    }
    if (costMinParam || costMaxParam) {
      const label = costMinParam && costMaxParam ? `Cost: \u00a3${costMinParam} \u2013 \u00a3${costMaxParam}` : costMinParam ? `Cost: > \u00a3${costMinParam}` : `Cost: < \u00a3${costMaxParam}`;
      filters.push({ key: "cost", label, onRemove: () => { handleFilterChange("costMin", ""); handleFilterChange("costMax", ""); } });
    }
    return filters;
  }, [expiryFromParam, expiryToParam, licenceTypeParam, costMinParam, costMaxParam, handleFilterChange]);

  const handleClearAllFilters = useCallback(() => {
    setSearchParams((prev) => {
      ["expiryFrom", "expiryTo", "licenceType", "costMin", "costMax"].forEach(k => prev.delete(k));
      prev.set("page", "1");
      return prev;
    });
  }, [setSearchParams]);

  const [exporting, setExporting] = useState(false);
  async function handleExport() {
    setExporting(true);
    try {
      await applicationsApi.exportCsv({
        search: searchParam || undefined,
        status: statusParam || undefined,
        includeStatuses,
        sortBy: sortByParam,
        sortDir: sortDirParam,
        typeId: typeIdParam || undefined,
        expiryFrom: expiryFromParam || undefined,
        expiryTo: expiryToParam || undefined,
        licenceType: licenceTypeParam || undefined,
        costMin: costMinParam || undefined,
        costMax: costMaxParam || undefined,
        ids: selectedIds.length > 0 ? selectedIds.join(",") : undefined,
      });
    } catch {
      toast.error("Failed to export applications");
    } finally {
      setExporting(false);
    }
  }

  function handleFormSubmit(values: ApplicationFormValues) {
    const customFieldValues = Object.entries(values.customFieldValues ?? {})
      .filter(([, v]) => v != null && v !== "" && v !== "__none__")
      .map(([fieldDefinitionId, value]) => ({
        fieldDefinitionId,
        value: value!,
      }));

    const data = {
      name: values.name,
      applicationTypeId: values.applicationTypeId,
      publisher: values.publisher || null,
      version: values.version || null,
      licenceKey: values.licenceKey || null,
      licenceType: values.licenceType && values.licenceType !== "none" ? values.licenceType : null,
      maxSeats: values.maxSeats ? parseInt(values.maxSeats, 10) : null,
      usedSeats: values.usedSeats ? parseInt(values.usedSeats, 10) : null,
      purchaseDate: values.purchaseDate ? `${values.purchaseDate}T00:00:00Z` : null,
      expiryDate: values.expiryDate ? `${values.expiryDate}T00:00:00Z` : null,
      purchaseCost: values.purchaseCost ? parseFloat(values.purchaseCost) : null,
      autoRenewal: values.autoRenewal ?? false,
      status: values.status || "Active",
      notes: values.notes || null,
      assetId: values.assetId && values.assetId !== "none" ? values.assetId : null,
      personId: values.personId && values.personId !== "none" ? values.personId : null,
      locationId: values.locationId && values.locationId !== "none" ? values.locationId : null,
      customFieldValues,
    };

    if (editingApplication) {
      updateMutation.mutate(
        { id: editingApplication.id, data },
        {
          onSuccess: () => {
            toast.success("Application updated");
            setFormOpen(false);
            setEditingApplication(null);
          },
          onError: () => {
            toast.error("Failed to update application");
          },
        },
      );
    } else {
      const doCreate = () => {
        createMutation.mutate(data, {
          onSuccess: () => {
            toast.success("Application created");
            setFormOpen(false);
            setDuplicateWarning(null);
          },
          onError: (error) => {
            toast.error(getApiErrorMessage(error, "Failed to create application"));
          },
        });
      };

      checkDuplicatesMutation.mutate(
        {
          name: data.name,
          publisher: data.publisher || undefined,
          licenceKey: data.licenceKey || undefined,
        },
        {
          onSuccess: (duplicates) => {
            if (duplicates.length === 0) {
              doCreate();
            } else {
              setDuplicateWarning({ duplicates, onConfirm: doCreate });
            }
          },
          onError: () => doCreate(),
        },
      );
    }
  }

  function handleArchive() {
    if (!archivingApplication) return;
    archiveMutation.mutate(archivingApplication.id, {
      onSuccess: () => {
        toast.success("Application deleted");
        setArchivingApplication(null);
      },
      onError: () => {
        toast.error("Failed to delete application");
      },
    });
  }

  function handleDeactivate(notes: string | null, deactivatedDate: string | null) {
    if (!deactivatingApplication) return;
    deactivateMutation.mutate(
      { id: deactivatingApplication.id, data: { notes, deactivatedDate } },
      {
        onSuccess: () => {
          toast.success("Application deactivated");
          setDeactivatingApplication(null);
        },
        onError: () => {
          toast.error("Failed to deactivate application");
        },
      },
    );
  }

  const selectedIds = Object.keys(rowSelection);
  const selectedCount = selectedIds.length;

  function handleBulkArchive() {
    bulkArchiveMutation.mutate(selectedIds, {
      onSuccess: (result) => {
        toast.success(`Archived ${result.succeeded} application(s)`);
        setRowSelection({});
        setBulkArchiveOpen(false);
      },
      onError: () => {
        toast.error("Failed to archive applications");
        setBulkArchiveOpen(false);
      },
    });
  }

  function handleBulkStatus(status: string) {
    bulkStatusMutation.mutate({ ids: selectedIds, status }, {
      onSuccess: (result) => {
        toast.success(`Updated ${result.succeeded} application(s) to ${status}`);
        setRowSelection({});
      },
      onError: () => {
        toast.error("Failed to update status");
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Applications / Licences" />
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
        <PageHeader title="Applications / Licences" />
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load applications. Is the API running?
        </div>
      </div>
    );
  }

  const totalCount = pagedResult?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications / Licences"
        description="Track software applications, licence keys, and renewal dates."
        actions={
          <div className="flex items-center gap-3">
            {!isLoading && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {totalCount}
              </span>
            )}
            <Button
              onClick={() => {
                setEditingApplication(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Application
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={pagedResult?.items ?? []}
        variant="borderless"
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(row: Application) => row.id}
        manualPagination
        manualSorting
        pageCount={pageCount}
        rowCount={totalCount}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        toolbar={(table) => (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <ApplicationsToolbar
                table={table}
                search={searchInput}
                onSearchChange={setSearchInput}
                statusFilter={statusParam}
                onStatusFilterChange={handleStatusFilterChange}
                includeInactive={includeInactive}
                onIncludeInactiveChange={handleIncludeInactiveChange}
                typeId={typeIdParam}
                onTypeIdChange={handleTypeIdChange}
                applicationTypes={applicationTypes ?? []}
                expiryFrom={expiryFromParam}
                expiryTo={expiryToParam}
                onExpiryFromChange={(v) => handleFilterChange("expiryFrom", v)}
                onExpiryToChange={(v) => handleFilterChange("expiryTo", v)}
                licenceType={licenceTypeParam}
                onLicenceTypeChange={(v) => handleFilterChange("licenceType", v)}
                costMin={costMinParam}
                costMax={costMaxParam}
                onCostMinChange={(v) => handleFilterChange("costMin", v)}
                onCostMaxChange={(v) => handleFilterChange("costMax", v)}
              />
              <div className="flex items-center gap-1.5">
                <SavedViewSelector
                  entityType="applications"
                  activeViewId={activeViewId}
                  onApplyView={applyView}
                  onResetToDefault={handleResetToDefault}
                  getCurrentConfiguration={getCurrentConfiguration}
                />
                <div className="w-px h-5 bg-border" />
                <ViewModeToggle viewMode={viewMode} onViewModeChange={handleViewModeChange} />
                <ExportButton onExport={handleExport} loading={exporting} selectedCount={selectedCount} />
              </div>
            </div>
            <ActiveFilterChips filters={activeFilters} onClearAll={handleClearAllFilters} />
            <BulkActionBar
              selectedCount={selectedCount}
              onClearSelection={() => setRowSelection({})}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkArchiveOpen(true)}
                disabled={bulkArchiveMutation.isPending}
              >
                <Archive className="mr-1 h-3 w-3" />
                Archive
              </Button>
              {["Active", "Expired", "Suspended", "PendingRenewal", "Inactive"].map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatus(s)}
                  disabled={bulkStatusMutation.isPending}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  {s === "PendingRenewal" ? "Pending Renewal" : s}
                </Button>
              ))}
            </BulkActionBar>
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
        hideTable={viewMode === "grouped"}
      >
        {viewMode === "grouped" && (
          <GroupedGridView
            items={pagedResult?.items ?? []}
            groupByKey="applicationTypeName"
            renderItem={(app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                onEdit={(a) => { setEditingApplication(a); setFormOpen(true); }}
                onArchive={(a) => setArchivingApplication(a)}
              />
            )}
          />
        )}
      </DataTable>

      <ApplicationFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingApplication(null);
        }}
        application={editingApplication}
        applicationTypes={applicationTypes ?? []}
        locations={locations ?? []}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archivingApplication}
        onOpenChange={(open) => {
          if (!open) setArchivingApplication(null);
        }}
        title="Delete application"
        description={`Are you sure you want to delete "${archivingApplication?.name}"? This action can be undone later.`}
        confirmLabel="Delete"
        onConfirm={handleArchive}
        loading={archiveMutation.isPending}
      />

      <ConfirmDialog
        open={bulkArchiveOpen}
        onOpenChange={setBulkArchiveOpen}
        title="Archive selected applications"
        description={`Are you sure you want to archive ${selectedCount} application(s)? This action can be undone later.`}
        confirmLabel="Archive"
        onConfirm={handleBulkArchive}
        loading={bulkArchiveMutation.isPending}
      />

      <DeactivateApplicationDialog
        open={!!deactivatingApplication}
        onOpenChange={(open) => {
          if (!open) setDeactivatingApplication(null);
        }}
        applicationName={deactivatingApplication?.name ?? ""}
        onSubmit={handleDeactivate}
        loading={deactivateMutation.isPending}
      />

      {duplicateWarning && (
        <DuplicateWarningDialog
          open={true}
          onOpenChange={(open) => { if (!open) setDuplicateWarning(null); }}
          duplicates={duplicateWarning.duplicates}
          entityType="applications"
          onCreateAnyway={duplicateWarning.onConfirm}
          loading={createMutation.isPending}
        />
      )}
    </div>
  );
}
