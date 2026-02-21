import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Archive, RefreshCw, Search, Download } from "lucide-react";
import type { SortingState, VisibilityState, RowSelectionState } from "@tanstack/react-table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { DataTablePagination } from "../components/data-table-pagination";
import { applicationsApi } from "../lib/api/applications";
import { getApiErrorMessage } from "../lib/api-client";
import { ConfirmDialog } from "../components/confirm-dialog";
import { DeactivateApplicationDialog } from "../components/applications/deactivate-application-dialog";
import { ApplicationFormDialog } from "../components/applications/application-form-dialog";
import { getApplicationColumns } from "../components/applications/columns";
import { GroupedGridView } from "../components/grouped-grid-view";
import { ApplicationCard } from "../components/applications/application-card";
import { FilterChip } from "../components/filter-chip";
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
import { useApplicationSummary } from "../hooks/use-dashboard";
import { getSelectionColumn } from "../components/data-table-selection-column";
import { BulkActionBar } from "../components/bulk-action-bar";
import { useApplicationTypes } from "../hooks/use-application-types";
import { useLocations } from "../hooks/use-locations";
import type { Application } from "../types/application";
import type { ApplicationFormValues } from "../lib/schemas/application";
import type { DuplicateCheckResult } from "../types/duplicate-check";
import { DuplicateWarningDialog } from "../components/shared/duplicate-warning-dialog";
import { cn } from "../lib/utils";

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
  const publisherParam = searchParams.get("publisher") ?? "";

  const [searchInput, setSearchInput] = useState(searchParam);
  const [tableDensity, setTableDensity] = useState<"comfortable" | "compact">("comfortable");
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
      publisher: publisherParam || undefined,
    }),
    [page, pageSize, searchParam, statusParam, includeStatuses, sortByParam, sortDirParam, typeIdParam, expiryFromParam, expiryToParam, licenceTypeParam, costMinParam, costMaxParam, publisherParam],
  );

  const { data: pagedResult, isLoading, isError } = usePagedApplications(queryParams);
  const { data: appSummary } = useApplicationSummary();
  const { data: applicationTypes } = useApplicationTypes();
  const { data: locations } = useLocations();
  const createMutation = useCreateApplication();
  const checkDuplicatesMutation = useCheckApplicationDuplicates();
  const updateMutation = useUpdateApplication();
  const archiveMutation = useArchiveApplication();
  const deactivateMutation = useDeactivateApplication();
  const bulkArchiveMutation = useBulkArchiveApplications();
  const bulkStatusMutation = useBulkStatusApplications();

  // Extract unique publishers for the filter chip
  const publisherOptions = useMemo(() => {
    const publishers = new Set<string>();
    for (const item of pagedResult?.items ?? []) {
      if (item.publisher) publishers.add(item.publisher);
    }
    return Array.from(publishers).sort().map((p) => ({ value: p, label: p }));
  }, [pagedResult?.items]);

  const handlePublisherChange = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        if (value) prev.set("publisher", value);
        else prev.delete("publisher");
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

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

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

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
        title="Applications"
        breadcrumbs={[{ label: "Software", href: "/applications" }, { label: "Applications / Licences" }]}
        actions={
          <Button
            onClick={() => {
              setEditingApplication(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Application
          </Button>
        }
      />

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground">Total Applications</p>
          <p className="text-xl font-bold mt-1">{appSummary?.totalApplications ?? totalCount}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground">Active Licences</p>
          <p className="text-xl font-bold mt-1">{appSummary?.active ?? "—"}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground">Pending Renewal</p>
          <p className="text-xl font-bold mt-1 text-primary">{appSummary?.pendingRenewal ?? "—"}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground">Expired</p>
          <p className="text-xl font-bold mt-1 text-orange-500">{appSummary?.expired ?? "—"}</p>
        </div>
      </div>

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
        tableDensity={tableDensity}
        toolbar={() => (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search applications..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <FilterChip
                  label="Publisher"
                  value={publisherParam}
                  options={publisherOptions}
                  onChange={handlePublisherChange}
                />
              </div>
              <div className="flex items-center gap-1">
                <div className="flex items-center rounded-lg border bg-card">
                  <button
                    type="button"
                    onClick={() => setTableDensity("comfortable")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-l-lg transition-colors",
                      tableDensity === "comfortable"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Comfortable
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableDensity("compact")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-r-lg transition-colors",
                      tableDensity === "compact"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Compact
                  </button>
                </div>
                <div className="w-px h-5 bg-border mx-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
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
