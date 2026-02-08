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
import { SavedViewSelector } from "../components/saved-view-selector";
import { ConfirmDialog } from "../components/confirm-dialog";
import { AssetFormDialog } from "../components/assets/asset-form-dialog";
import { AssetsToolbar } from "../components/assets/assets-toolbar";
import { getAssetColumns } from "../components/assets/columns";
import {
  usePagedAssets,
  useCreateAsset,
  useUpdateAsset,
  useArchiveAsset,
} from "../hooks/use-assets";
import { useAssetTypes } from "../hooks/use-asset-types";
import { useLocations } from "../hooks/use-locations";
import { useSavedViews } from "../hooks/use-saved-views";
import type { Asset } from "../types/asset";
import type { AssetFormValues } from "../lib/schemas/asset";
import type { CustomFieldDefinition } from "../types/custom-field";
import type { SavedView, ViewConfiguration } from "../types/saved-view";

// Map TanStack column IDs to backend sortBy values
const SORT_FIELD_MAP: Record<string, string> = {
  name: "name",
  assetTag: "assetTag",
  status: "status",
  assetTypeName: "assetTypeName",
  locationName: "locationName",
  purchaseDate: "purchaseDate",
  purchaseCost: "purchaseCost",
  warrantyExpiryDate: "warrantyExpiryDate",
  createdAt: "createdAt",
};

export default function AssetsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL params
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 25;
  const searchParam = searchParams.get("search") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const sortByParam = searchParams.get("sortBy") ?? "name";
  const sortDirParam = searchParams.get("sortDir") ?? "asc";

  // Debounced search: local input state synced to URL after 300ms
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

  // Sync searchInput when URL search param changes externally (e.g. browser back)
  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  // Query params for the API
  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      search: searchParam || undefined,
      status: statusParam || undefined,
      sortBy: sortByParam,
      sortDir: sortDirParam,
    }),
    [page, pageSize, searchParam, statusParam, sortByParam, sortDirParam],
  );

  const { data: pagedResult, isLoading, isError } = usePagedAssets(queryParams);
  const { data: assetTypes } = useAssetTypes();
  const { data: locations } = useLocations();
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const archiveMutation = useArchiveAsset();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [archivingAsset, setArchivingAsset] = useState<Asset | null>(null);

  // Saved views
  const { data: savedViews = [] } = useSavedViews("assets");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const defaultViewApplied = useRef(false);

  // Gather all unique custom field definitions from loaded asset types
  const allCustomFieldDefs = useMemo(() => {
    if (!assetTypes) return [];
    const seen = new Set<string>();
    const defs: CustomFieldDefinition[] = [];
    for (const at of assetTypes) {
      for (const cf of at.customFields ?? []) {
        if (!seen.has(cf.id)) {
          seen.add(cf.id);
          defs.push(cf);
        }
      }
    }
    return defs;
  }, [assetTypes]);

  const columns = useMemo(
    () =>
      getAssetColumns({
        onEdit: (asset) => {
          setEditingAsset(asset);
          setFormOpen(true);
        },
        onArchive: (asset) => {
          setArchivingAsset(asset);
        },
        customFieldDefinitions: allCustomFieldDefs,
      }),
    [allCustomFieldDefs],
  );

  // Hide custom field columns by default
  const defaultColumnVisibility = useMemo<VisibilityState>(() => {
    const vis: VisibilityState = {};
    for (const cf of allCustomFieldDefs) {
      vis[`cf_${cf.id}`] = false;
    }
    return vis;
  }, [allCustomFieldDefs]);

  // Apply default saved view on first load
  useEffect(() => {
    if (defaultViewApplied.current || savedViews.length === 0) return;
    defaultViewApplied.current = true;
    const defaultView = savedViews.find((v) => v.isDefault);
    if (defaultView) {
      applyView(defaultView);
    } else {
      setColumnVisibility(defaultColumnVisibility);
    }
  }, [savedViews, defaultColumnVisibility]);

  // If no saved views yet, apply default column visibility
  useEffect(() => {
    if (!defaultViewApplied.current && savedViews.length === 0 && Object.keys(defaultColumnVisibility).length > 0) {
      setColumnVisibility((prev) => {
        // Merge: keep existing user changes, add new defaults for custom fields
        const merged = { ...prev };
        for (const [key, val] of Object.entries(defaultColumnVisibility)) {
          if (!(key in merged)) merged[key] = val;
        }
        return merged;
      });
    }
  }, [defaultColumnVisibility, savedViews.length]);

  function applyView(view: SavedView) {
    try {
      const config: ViewConfiguration = JSON.parse(view.configuration);
      setColumnVisibility({ ...defaultColumnVisibility, ...config.columnVisibility });
      setActiveViewId(view.id);
      setSearchParams((prev) => {
        if (config.sortBy) prev.set("sortBy", config.sortBy);
        if (config.sortDir) prev.set("sortDir", config.sortDir);
        if (config.search) { prev.set("search", config.search); setSearchInput(config.search); }
        else { prev.delete("search"); setSearchInput(""); }
        if (config.status) prev.set("status", config.status);
        else prev.delete("status");
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
    pageSize,
  }), [columnVisibility, sortByParam, sortDirParam, searchParam, statusParam, pageSize]);

  // Sorting: derive TanStack SortingState from URL
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

  const handleStatusChange = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        if (value === "all") {
          prev.delete("status");
        } else {
          prev.set("status", value);
        }
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

  function handleFormSubmit(values: AssetFormValues) {
    const customFieldValues = Object.entries(values.customFieldValues ?? {})
      .filter(([, v]) => v != null && v !== "" && v !== "__none__")
      .map(([fieldDefinitionId, value]) => ({
        fieldDefinitionId,
        value: value!,
      }));

    const data = {
      name: values.name,
      assetTag: values.assetTag,
      serialNumber: values.serialNumber || null,
      status: values.status || "Available",
      assetTypeId: values.assetTypeId,
      locationId:
        values.locationId && values.locationId !== "none"
          ? values.locationId
          : null,
      assignedPersonId:
        values.assignedPersonId && values.assignedPersonId !== "none"
          ? values.assignedPersonId
          : null,
      purchaseDate: values.purchaseDate
        ? `${values.purchaseDate}T00:00:00Z`
        : null,
      purchaseCost: values.purchaseCost
        ? parseFloat(values.purchaseCost)
        : null,
      warrantyExpiryDate: values.warrantyExpiryDate
        ? `${values.warrantyExpiryDate}T00:00:00Z`
        : null,
      notes: values.notes || null,
      customFieldValues,
    };

    if (editingAsset) {
      updateMutation.mutate(
        { id: editingAsset.id, data },
        {
          onSuccess: () => {
            toast.success("Asset updated");
            setFormOpen(false);
            setEditingAsset(null);
          },
          onError: () => {
            toast.error("Failed to update asset");
          },
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Asset created");
          setFormOpen(false);
        },
        onError: () => {
          toast.error("Failed to create asset");
        },
      });
    }
  }

  function handleArchive() {
    if (!archivingAsset) return;
    archiveMutation.mutate(archivingAsset.id, {
      onSuccess: () => {
        toast.success("Asset deleted");
        setArchivingAsset(null);
      },
      onError: () => {
        toast.error("Failed to delete asset");
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assets" />
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
        <PageHeader title="Assets" />
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load assets. Is the API running?
        </div>
      </div>
    );
  }

  const totalCount = pagedResult?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description="Manage hardware and software assets."
        actions={
          <Button
            onClick={() => {
              setEditingAsset(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
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
            <AssetsToolbar
              table={table}
              search={searchInput}
              onSearchChange={setSearchInput}
              status={statusParam}
              onStatusChange={handleStatusChange}
            />
            <SavedViewSelector
              entityType="assets"
              activeViewId={activeViewId}
              onApplyView={applyView}
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

      <AssetFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingAsset(null);
        }}
        asset={editingAsset}
        assetTypes={assetTypes ?? []}
        locations={locations ?? []}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archivingAsset}
        onOpenChange={(open) => {
          if (!open) setArchivingAsset(null);
        }}
        title="Delete asset"
        description={`Are you sure you want to delete "${archivingAsset?.name}" (${archivingAsset?.assetTag})? This action can be undone later.`}
        confirmLabel="Delete"
        onConfirm={handleArchive}
        loading={archiveMutation.isPending}
      />
    </div>
  );
}
