import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { locationsApi } from "../lib/api/locations";
import { getApiErrorMessage } from "../lib/api-client";
import { ExportButton } from "../components/export-button";
import type { SortingState, VisibilityState } from "@tanstack/react-table";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { DataTablePagination } from "../components/data-table-pagination";
import { ConfirmDialog } from "../components/confirm-dialog";
import { LocationFormDialog } from "../components/locations/location-form-dialog";
import { LocationsToolbar } from "../components/locations/locations-toolbar";
import { getLocationColumns } from "../components/locations/columns";
import {
  usePagedLocations,
  useCreateLocation,
  useUpdateLocation,
  useArchiveLocation,
  useCheckLocationDuplicates,
} from "../hooks/use-locations";
import type { Location } from "../types/location";
import type { LocationFormValues } from "../lib/schemas/location";
import { SavedViewSelector } from "../components/saved-view-selector";
import { useSavedViews } from "../hooks/use-saved-views";
import type { SavedView, ViewConfiguration } from "../types/saved-view";
import type { DuplicateCheckResult } from "../types/duplicate-check";
import { DuplicateWarningDialog } from "../components/shared/duplicate-warning-dialog";

const SORT_FIELD_MAP: Record<string, string> = {
  name: "name",
  address: "address",
  city: "city",
  country: "country",
  createdAt: "createdAt",
};

export default function LocationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 25;
  const searchParam = searchParams.get("search") ?? "";
  const sortByParam = searchParams.get("sortBy") ?? "name";
  const sortDirParam = searchParams.get("sortDir") ?? "asc";

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
      sortBy: sortByParam,
      sortDir: sortDirParam,
    }),
    [page, pageSize, searchParam, sortByParam, sortDirParam],
  );

  const { data: pagedResult, isLoading, isError } = usePagedLocations(queryParams);
  const createMutation = useCreateLocation();
  const checkDuplicatesMutation = useCheckLocationDuplicates();
  const updateMutation = useUpdateLocation();
  const archiveMutation = useArchiveLocation();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [archivingLocation, setArchivingLocation] = useState<Location | null>(
    null,
  );
  const [duplicateWarning, setDuplicateWarning] = useState<{
    duplicates: DuplicateCheckResult[];
    onConfirm: () => void;
  } | null>(null);

  // Saved views
  const { data: savedViews = [] } = useSavedViews("locations");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const defaultViewApplied = useRef(false);

  const columns = useMemo(
    () =>
      getLocationColumns({
        onEdit: (location) => {
          setEditingLocation(location);
          setFormOpen(true);
        },
        onArchive: (location) => {
          setArchivingLocation(location);
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
    pageSize,
  }), [columnVisibility, sortByParam, sortDirParam, searchParam, pageSize]);

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
      await locationsApi.exportCsv({
        search: searchParam || undefined,
        sortBy: sortByParam,
        sortDir: sortDirParam,
      });
    } catch {
      toast.error("Failed to export locations");
    } finally {
      setExporting(false);
    }
  }

  function handleFormSubmit(values: LocationFormValues) {
    const data = {
      name: values.name,
      address: values.address || null,
      city: values.city || null,
      country: values.country || null,
    };

    if (editingLocation) {
      updateMutation.mutate(
        { id: editingLocation.id, data },
        {
          onSuccess: () => {
            toast.success("Location updated");
            setFormOpen(false);
            setEditingLocation(null);
          },
          onError: () => {
            toast.error("Failed to update location");
          },
        },
      );
    } else {
      const doCreate = () => {
        createMutation.mutate(data, {
          onSuccess: () => {
            toast.success("Location created");
            setFormOpen(false);
            setDuplicateWarning(null);
          },
          onError: (error) => {
            toast.error(getApiErrorMessage(error, "Failed to create location"));
          },
        });
      };

      checkDuplicatesMutation.mutate(
        { name: data.name },
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
    if (!archivingLocation) return;
    archiveMutation.mutate(archivingLocation.id, {
      onSuccess: () => {
        toast.success("Location deleted");
        setArchivingLocation(null);
      },
      onError: () => {
        toast.error("Failed to delete location");
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Locations" />
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
        <PageHeader title="Locations" />
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load locations. Is the API running?
        </div>
      </div>
    );
  }

  const totalCount = pagedResult?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description="Manage offices, warehouses, and other locations."
        actions={
          <div className="flex items-center gap-3">
            {!isLoading && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {totalCount}
              </span>
            )}
            <Button
              onClick={() => {
                setEditingLocation(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Location
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
        manualPagination
        manualSorting
        pageCount={pageCount}
        rowCount={totalCount}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        toolbar={(table) => (
          <div className="flex items-center gap-2">
            <LocationsToolbar
              table={table}
              search={searchInput}
              onSearchChange={setSearchInput}
            />
            <ExportButton onExport={handleExport} loading={exporting} />
            <SavedViewSelector
              entityType="locations"
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
      />

      <LocationFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingLocation(null);
        }}
        location={editingLocation}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archivingLocation}
        onOpenChange={(open) => {
          if (!open) setArchivingLocation(null);
        }}
        title="Delete location"
        description={`Are you sure you want to delete "${archivingLocation?.name}"? This action can be undone later.`}
        confirmLabel="Delete"
        onConfirm={handleArchive}
        loading={archiveMutation.isPending}
      />

      {duplicateWarning && (
        <DuplicateWarningDialog
          open={true}
          onOpenChange={(open) => { if (!open) setDuplicateWarning(null); }}
          duplicates={duplicateWarning.duplicates}
          entityType="locations"
          onCreateAnyway={duplicateWarning.onConfirm}
          loading={createMutation.isPending}
        />
      )}
    </div>
  );
}
