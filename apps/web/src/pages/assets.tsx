import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Archive, RefreshCw, Pencil } from "lucide-react";
import { assetsApi } from "../lib/api/assets";
import { getApiErrorMessage, errorMessage} from "../lib/api-client";
import { ExportButton } from "../components/export-button";
import type { VisibilityState } from "@tanstack/react-table";
import { useListPage } from "../hooks/use-list-page";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { DataTablePagination } from "../components/data-table-pagination";
import { ConfirmDialog } from "../components/confirm-dialog";
import { AssetFormDialog } from "../components/assets/asset-form-dialog";
import { BulkEditDialog } from "../components/assets/bulk-edit-dialog";
import { AssetsToolbar } from "../components/assets/assets-toolbar";
import { getAssetColumns } from "../components/assets/columns";
import { getSelectionColumn } from "../components/data-table-selection-column";
import { GroupedGridView } from "../components/grouped-grid-view";
import { ViewModeToggle } from "../components/view-mode-toggle";
import { SavedViewSelector } from "../components/saved-view-selector";
import { ArchivedToggle } from "@/components/archived-toggle";
import { AssetCard } from "../components/assets/asset-card";
import {
  usePagedAssets,
  useCreateAsset,
  useUpdateAsset,
  useArchiveAsset,
  useRestoreAsset,
  useBulkArchiveAssets,
  useBulkStatusAssets,
  useBulkEditAssets,
  useCheckAssetDuplicates,
} from "../hooks/use-assets";
import { BulkActionBar } from "../components/bulk-action-bar";
import { useAssetTypes } from "../hooks/use-asset-types";
import { useLocations } from "../hooks/use-locations";
import { useSavedViewState } from "../hooks/use-saved-view-state";
import type { Asset, BulkEditAssetsRequest } from "../types/asset";
import type { AssetFormValues } from "../lib/schemas/asset";
import type { CustomFieldDefinition } from "../types/custom-field";
import type { DuplicateCheckResult } from "../types/duplicate-check";
import { DuplicateWarningDialog } from "../components/shared/duplicate-warning-dialog";
import { usePeople } from "../hooks/use-people";
import { useAuth } from "@/contexts/auth-context";

// Map TanStack column IDs to backend sortBy values
const SORT_FIELD_MAP: Record<string, string> = {
  name: "name",
  serialNumber: "serialNumber",
  status: "status",
  assetTypeName: "assetTypeName",
  locationName: "locationName",
  purchaseDate: "purchaseDate",
  purchaseCost: "purchaseCost",
  warrantyExpiryDate: "warrantyExpiryDate",
  createdAt: "createdAt",
};

/** Filter params this list stores in a saved view. */
const SAVED_VIEW_FILTER_KEYS = ["locationId", "assignedPersonId", "purchaseDateFrom", "purchaseDateTo",
   "warrantyExpiryFrom", "warrantyExpiryTo", "costMin", "costMax", "unassigned",
   "createdAfter", "includeArchived"] as const;

export default function AssetsPage() {
  const { canWrite } = useAuth();
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
    rowSelection,
    setRowSelection,
    selectedIds,
  } = useListPage({ sortFieldMap: SORT_FIELD_MAP, defaultSortBy: "name" });

  // Read URL params
  const statusParam = searchParams.get("status") ?? "";
  const includeRetired = searchParams.get("includeRetired") === "true";
  const includeSold = searchParams.get("includeSold") === "true";
  const typeIdParam = searchParams.get("typeId") ?? "";
  const viewMode = (searchParams.get("viewMode") as "list" | "grouped") || "list";
  // Archived rows are hidden until asked for; this is what makes a
  // soft-deleted record findable again so it can be restored.
  const showArchived = searchParams.get("includeArchived") === "true";

  // Exposes the grouped view, which the page already renders but had no control
  // to reach — it was previously only accessible by editing the URL by hand.
  const handleViewModeChange = (mode: "list" | "grouped") =>
    handleFilterChange("viewMode", mode === "list" ? "" : mode);

  const locationIdParam = searchParams.get("locationId") ?? "";
  const assignedPersonIdParam = searchParams.get("assignedPersonId") ?? "";
  const purchaseDateFromParam = searchParams.get("purchaseDateFrom") ?? "";
  const purchaseDateToParam = searchParams.get("purchaseDateTo") ?? "";
  const warrantyExpiryFromParam = searchParams.get("warrantyExpiryFrom") ?? "";
  const warrantyExpiryToParam = searchParams.get("warrantyExpiryTo") ?? "";
  const costMinParam = searchParams.get("costMin") ?? "";
  const costMaxParam = searchParams.get("costMax") ?? "";
  const unassignedParam = searchParams.get("unassigned") ?? "";
  const createdAfterParam = searchParams.get("createdAfter") ?? "";

  // Build includeStatuses from checkbox flags
  const includeStatuses = useMemo(() => {
    const parts: string[] = [];
    if (includeRetired) parts.push("Retired");
    if (includeSold) parts.push("Sold");
    return parts.length > 0 ? parts.join(",") : undefined;
  }, [includeRetired, includeSold]);

  // Query params for the API
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
      locationId: locationIdParam || undefined,
      assignedPersonId: assignedPersonIdParam || undefined,
      purchaseDateFrom: purchaseDateFromParam || undefined,
      purchaseDateTo: purchaseDateToParam || undefined,
      warrantyExpiryFrom: warrantyExpiryFromParam || undefined,
      warrantyExpiryTo: warrantyExpiryToParam || undefined,
      costMin: costMinParam || undefined,
      costMax: costMaxParam || undefined,
      unassigned: unassignedParam || undefined,
      createdAfter: createdAfterParam || undefined,
      includeArchived: showArchived || undefined,
    }),
    [page, pageSize, searchParam, statusParam, includeStatuses, sortByParam, sortDirParam, typeIdParam, locationIdParam, assignedPersonIdParam, purchaseDateFromParam, purchaseDateToParam, warrantyExpiryFromParam, warrantyExpiryToParam, costMinParam, costMaxParam, unassignedParam, createdAfterParam, showArchived],
  );

  const { data: pagedResult, isLoading, isError } = usePagedAssets(queryParams);
  const { data: assetTypes } = useAssetTypes();
  const { data: locations } = useLocations();
  const { data: people } = usePeople();
  const createMutation = useCreateAsset();
  const checkDuplicatesMutation = useCheckAssetDuplicates();
  const updateMutation = useUpdateAsset();
  const archiveMutation = useArchiveAsset();
  const restoreMutation = useRestoreAsset();
  const bulkArchiveMutation = useBulkArchiveAssets();
  const bulkStatusMutation = useBulkStatusAssets();
  const bulkEditMutation = useBulkEditAssets();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [archivingAsset, setArchivingAsset] = useState<Asset | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    duplicates: DuplicateCheckResult[];
    onConfirm: () => void;
  } | null>(null);
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  // Saved views
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});


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

  // Stable, so the columns memo that depends on it isn't rebuilt every render.
  const handleRestore = useCallback((id: string, name: string) => {
    restoreMutation.mutate(id, {
      onSuccess: () => toast.success(`Restored ${name}`),
      onError: (error) => toast.error(getApiErrorMessage(error, "Failed to restore")),
    });
  }, [restoreMutation]);

  const columns = useMemo(
    () => [
      getSelectionColumn<Asset>(),
      ...getAssetColumns({
        canWrite,
        onEdit: (asset) => {
          setEditingAsset(asset);
          setFormOpen(true);
        },
        onArchive: (asset) => {
          setArchivingAsset(asset);
        },
        onRestore: (asset) => handleRestore(asset.id, asset.name),
        customFieldDefinitions: allCustomFieldDefs,
      }),
    ],
    [allCustomFieldDefs, canWrite, handleRestore],
  );

  // Hide custom field columns by default
  const defaultColumnVisibility = useMemo<VisibilityState>(() => {
    const vis: VisibilityState = {};
    for (const cf of allCustomFieldDefs) {
      vis[`cf_${cf.id}`] = false;
    }
    return vis;
  }, [allCustomFieldDefs]);

  const { activeViewId, applyView, handleResetToDefault, getCurrentConfiguration } =
    useSavedViewState({
      entityType: "assets",
      filterKeys: SAVED_VIEW_FILTER_KEYS,
      defaultSortBy: "name",
      defaultColumnVisibility,
      searchParams,
      setSearchParams,
      setSearchInput,
      columnVisibility,
      setColumnVisibility,
      pageSize,
    });

  // When custom field defs load, hide them by default
  useEffect(() => {
    if (allCustomFieldDefs.length === 0) return;
  // Reacts to data that arrives asynchronously; removing the effect needs a
  // real refactor, tracked separately rather than folded into a dependency
  // upgrade.
  // eslint-disable-next-line react-hooks/set-state-in-effect
    setColumnVisibility((prev) => {
      const next = { ...prev };
      for (const cf of allCustomFieldDefs) {
        const key = `cf_${cf.id}`;
        if (!(key in next)) next[key] = false;
      }
      return next;
    });
  }, [allCustomFieldDefs]);


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

  const handleIncludeRetiredChange = useCallback(
    (value: boolean) => {
      setSearchParams((prev) => {
        if (value) prev.set("includeRetired", "true");
        else prev.delete("includeRetired");
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

  const handleIncludeSoldChange = useCallback(
    (value: boolean) => {
      setSearchParams((prev) => {
        if (value) prev.set("includeSold", "true");
        else prev.delete("includeSold");
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

  const [exporting, setExporting] = useState(false);
  async function handleExport() {
    setExporting(true);
    try {
      await assetsApi.exportCsv({
        search: searchParam || undefined,
        status: statusParam || undefined,
        includeStatuses: buildIncludeStatuses(),
        sortBy: sortByParam,
        sortDir: sortDirParam,
        typeId: typeIdParam || undefined,
        locationId: locationIdParam || undefined,
        assignedPersonId: assignedPersonIdParam || undefined,
        purchaseDateFrom: purchaseDateFromParam || undefined,
        purchaseDateTo: purchaseDateToParam || undefined,
        warrantyExpiryFrom: warrantyExpiryFromParam || undefined,
        warrantyExpiryTo: warrantyExpiryToParam || undefined,
        costMin: costMinParam || undefined,
        costMax: costMaxParam || undefined,
        unassigned: unassignedParam || undefined,
        createdAfter: createdAfterParam || undefined,
        ids: selectedIds.length > 0 ? selectedIds.join(",") : undefined,
      });
    } catch {
      toast.error("Failed to export assets");
    } finally {
      setExporting(false);
    }
  }

  function buildIncludeStatuses(): string | undefined {
    const parts: string[] = [];
    if (includeRetired) parts.push("Retired");
    if (includeSold) parts.push("Sold");
    return parts.length > 0 ? parts.join(",") : undefined;
  }

  function handleFormSubmit(values: AssetFormValues) {
    const customFieldValues = Object.entries(values.customFieldValues ?? {})
      .filter(([, v]) => v != null && v !== "" && v !== "__none__")
      .map(([fieldDefinitionId, value]) => ({
        fieldDefinitionId,
        value: value!,
      }));

    const data = {
      name: values.name,
      serialNumber: values.serialNumber,
      status: values.status || "Available",
      assetTypeId: values.assetTypeId,
      assetModelId: values.assetModelId && values.assetModelId !== "" && values.assetModelId !== "__none__" ? values.assetModelId : null,
      locationId: values.locationId,
      assignedPersonId:
        values.assignedPersonId && values.assignedPersonId !== "none"
          ? values.assignedPersonId
          : null,
      purchaseDate: values.purchaseDate
        ? values.purchaseDate
        : null,
      purchaseCost: values.purchaseCost
        ? parseFloat(values.purchaseCost)
        : null,
      warrantyExpiryDate: values.warrantyExpiryDate
        ? values.warrantyExpiryDate
        : null,
      depreciationMonths: values.depreciationMonths
        ? parseInt(values.depreciationMonths, 10)
        : null,
      notes: values.notes || null,
      customFieldValues,
    };

    if (editingAsset) {
      updateMutation.mutate(
        { id: editingAsset.id, data: { ...data, entityVersion: editingAsset.entityVersion } },
        {
          onSuccess: () => {
            toast.success("Asset updated");
            setFormOpen(false);
            setEditingAsset(null);
          },
          onError: (err) => {
            toast.error(errorMessage(err, "Failed to update asset"));
          },
        },
      );
    } else {
      const doCreate = () => {
        createMutation.mutate(data, {
          onSuccess: () => {
            toast.success("Asset created");
            setFormOpen(false);
            setDuplicateWarning(null);
          },
          onError: (error) => {
            toast.error(getApiErrorMessage(error, "Failed to create asset"));
          },
        });
      };

      checkDuplicatesMutation.mutate(
        {
          name: data.name,
          serialNumber: data.serialNumber || undefined,
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

  const selectedCount = selectedIds.length;

  function handleBulkArchive() {
    bulkArchiveMutation.mutate(selectedIds, {
      onSuccess: (result) => {
        toast.success(`Archived ${result.succeeded} asset(s)`);
        setRowSelection({});
        setBulkArchiveOpen(false);
      },
      onError: () => {
        toast.error("Failed to archive assets");
        setBulkArchiveOpen(false);
      },
    });
  }

  function handleBulkEdit(request: BulkEditAssetsRequest) {
    bulkEditMutation.mutate(request, {
      onSuccess: (result) => {
        toast.success(`Updated ${result.succeeded} asset(s)`);
        setRowSelection({});
        setBulkEditOpen(false);
      },
      onError: () => {
        toast.error("Failed to bulk edit assets");
      },
    });
  }

  function handleBulkStatus(status: string) {
    bulkStatusMutation.mutate({ ids: selectedIds, status }, {
      onSuccess: (result) => {
        toast.success(`Updated ${result.succeeded} asset(s) to ${status}`);
        setRowSelection({});
      },
      onError: (err) => {
        toast.error(errorMessage(err, "Failed to update status"));
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Assets"
          breadcrumbs={[{ label: "Assets", href: "/assets" }, { label: "Assets" }]}
        />
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
        <PageHeader
          title="Assets"
          breadcrumbs={[{ label: "Assets", href: "/assets" }, { label: "Assets" }]}
        />
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
        breadcrumbs={[
          { label: "Assets", href: "/assets" },
          { label: "Assets" },
        ]}
        description={`Managing ${totalCount.toLocaleString()} total assets`}
        actions={
          <div className="flex items-center gap-3">
            {canWrite && (
              <Button
                onClick={() => {
                  setEditingAsset(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            )}
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
        getRowId={(row: Asset) => row.id}
        manualPagination
        manualSorting
        pageCount={pageCount}
        rowCount={totalCount}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        toolbar={(table) => (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <AssetsToolbar
                table={table}
                search={searchInput}
                onSearchChange={setSearchInput}
                status={statusParam}
                onStatusChange={handleStatusChange}
                includeRetired={includeRetired}
                onIncludeRetiredChange={handleIncludeRetiredChange}
                includeSold={includeSold}
                onIncludeSoldChange={handleIncludeSoldChange}
                typeId={typeIdParam}
                onTypeIdChange={handleTypeIdChange}
                assetTypes={assetTypes ?? []}
                locationId={locationIdParam}
                onLocationIdChange={(v) => handleFilterChange("locationId", v)}
                locations={locations ?? []}
                assignedPersonId={assignedPersonIdParam}
                onAssignedPersonIdChange={(v) => handleFilterChange("assignedPersonId", v)}
                people={people ?? []}
                purchaseDateFrom={purchaseDateFromParam}
                purchaseDateTo={purchaseDateToParam}
                onPurchaseDateFromChange={(v) => handleFilterChange("purchaseDateFrom", v)}
                onPurchaseDateToChange={(v) => handleFilterChange("purchaseDateTo", v)}
                warrantyExpiryFrom={warrantyExpiryFromParam}
                warrantyExpiryTo={warrantyExpiryToParam}
                onWarrantyExpiryFromChange={(v) => handleFilterChange("warrantyExpiryFrom", v)}
                onWarrantyExpiryToChange={(v) => handleFilterChange("warrantyExpiryTo", v)}
                costMin={costMinParam}
                costMax={costMaxParam}
                onCostMinChange={(v) => handleFilterChange("costMin", v)}
                onCostMaxChange={(v) => handleFilterChange("costMax", v)}
              />
              <div className="flex items-center gap-1.5">
                <ArchivedToggle
                  showArchived={showArchived}
                  onShowArchivedChange={(v) => handleFilterChange("includeArchived", v ? "true" : "")}
                />
                <SavedViewSelector
                  entityType="assets"
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
            {/* Bulk actions (only when selected) */}
            <BulkActionBar
              canWrite={canWrite}
              selectedCount={selectedCount}
              onClearSelection={() => setRowSelection({})}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkEditOpen(true)}
                disabled={bulkEditMutation.isPending}
              >
                <Pencil className="mr-1 h-3 w-3" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkArchiveOpen(true)}
                disabled={bulkArchiveMutation.isPending}
              >
                <Archive className="mr-1 h-3 w-3" />
                Archive
              </Button>
              {["Available", "Assigned", "InMaintenance"].map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatus(s)}
                  disabled={bulkStatusMutation.isPending}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  {s === "InMaintenance" ? "In Maintenance" : s}
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
            groupByKey="assetTypeName"
            renderItem={(asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onEdit={(a) => { setEditingAsset(a); setFormOpen(true); }}
                onArchive={(a) => setArchivingAsset(a)}
              />
            )}
          />
        )}
      </DataTable>

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
        loading={createMutation.isPending || updateMutation.isPending || checkDuplicatesMutation.isPending}
      />

      <ConfirmDialog
        open={!!archivingAsset}
        onOpenChange={(open) => {
          if (!open) setArchivingAsset(null);
        }}
        title="Delete asset"
        description={`Are you sure you want to delete "${archivingAsset?.name}"? This action can be undone later.`}
        confirmLabel="Delete"
        onConfirm={handleArchive}
        loading={archiveMutation.isPending}
      />

      <ConfirmDialog
        open={bulkArchiveOpen}
        onOpenChange={setBulkArchiveOpen}
        title="Archive selected assets"
        description={`Are you sure you want to archive ${selectedCount} asset(s)? This action can be undone later.`}
        confirmLabel="Archive"
        onConfirm={handleBulkArchive}
        loading={bulkArchiveMutation.isPending}
      />

      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedIds={selectedIds}
        locations={locations ?? []}
        onSubmit={handleBulkEdit}
        loading={bulkEditMutation.isPending}
      />

      {duplicateWarning && (
        <DuplicateWarningDialog
          open={true}
          onOpenChange={(open) => { if (!open) setDuplicateWarning(null); }}
          duplicates={duplicateWarning.duplicates}
          entityType="assets"
          onCreateAnyway={duplicateWarning.onConfirm}
          loading={createMutation.isPending}
        />
      )}
    </div>
  );
}
