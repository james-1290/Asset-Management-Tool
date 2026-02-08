import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { SortingState, VisibilityState } from "@tanstack/react-table";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { DataTablePagination } from "../components/data-table-pagination";
import { ConfirmDialog } from "../components/confirm-dialog";
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
} from "../hooks/use-applications";
import { useApplicationTypes } from "../hooks/use-application-types";
import { useLocations } from "../hooks/use-locations";
import type { Application } from "../types/application";
import type { ApplicationFormValues } from "../lib/schemas/application";
import { SavedViewSelector } from "../components/saved-view-selector";
import { useSavedViews } from "../hooks/use-saved-views";
import type { SavedView, ViewConfiguration } from "../types/saved-view";

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
    }),
    [page, pageSize, searchParam, statusParam, includeStatuses, sortByParam, sortDirParam, typeIdParam],
  );

  const { data: pagedResult, isLoading, isError } = usePagedApplications(queryParams);
  const { data: applicationTypes } = useApplicationTypes();
  const { data: locations } = useLocations();
  const createMutation = useCreateApplication();
  const updateMutation = useUpdateApplication();
  const archiveMutation = useArchiveApplication();

  const [formOpen, setFormOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [archivingApplication, setArchivingApplication] = useState<Application | null>(null);

  // Saved views
  const { data: savedViews = [] } = useSavedViews("applications");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const defaultViewApplied = useRef(false);

  const columns = useMemo(
    () =>
      getApplicationColumns({
        onEdit: (application) => {
          setEditingApplication(application);
          setFormOpen(true);
        },
        onArchive: (application) => {
          setArchivingApplication(application);
        },
      }),
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
  }), [columnVisibility, sortByParam, sortDirParam, searchParam, statusParam, typeIdParam, viewMode, pageSize]);

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
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Application created");
          setFormOpen(false);
        },
        onError: () => {
          toast.error("Failed to create application");
        },
      });
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

      <DataTable
        columns={columns}
        data={pagedResult?.items ?? []}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        manualPagination
        manualSorting
        pageCount={pageCount}
        rowCount={totalCount}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        toolbar={(table) => (
          <div className="flex items-center gap-2">
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
            />
            <ViewModeToggle viewMode={viewMode} onViewModeChange={handleViewModeChange} />
            <SavedViewSelector
              entityType="applications"
              activeViewId={activeViewId}
              onApplyView={applyView}
              onResetToDefault={handleResetToDefault}
              getCurrentConfiguration={getCurrentConfiguration}
            />
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
    </div>
  );
}
