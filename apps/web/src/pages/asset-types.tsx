import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage, errorMessage} from "../lib/api-client";
import { Plus, Trash2 } from "lucide-react";
import type { VisibilityState } from "@tanstack/react-table";
import { useListPage } from "../hooks/use-list-page";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { DataTablePagination } from "../components/data-table-pagination";
import { ConfirmDialog } from "../components/confirm-dialog";
import { TypeFormDialog } from "../components/type-management/type-form-dialog";
import { TypesToolbar } from "../components/type-management/types-toolbar";
import { getTypeColumns } from "../components/type-management/type-columns";
import { mapCustomFieldsToForm } from "../components/type-management/custom-fields";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import {
  usePagedAssetTypes,
  useCreateAssetType,
  useUpdateAssetType,
  useArchiveAssetType,
  useRestoreAssetType,
  useBulkArchiveAssetTypes,
} from "../hooks/use-asset-types";
import { getSelectionColumn } from "../components/data-table-selection-column";
import { BulkActionBar } from "../components/bulk-action-bar";
import type { AssetType } from "../types/asset-type";
import { assetTypeSchema, type AssetTypeFormValues } from "../lib/schemas/asset-type";
import { SavedViewSelector } from "../components/saved-view-selector";
import { useAuth } from "@/contexts/auth-context";
import { useSavedViewState } from "../hooks/use-saved-view-state";

const SAVED_VIEW_FILTER_KEYS = ["includeArchived"] as const;

const SORT_FIELD_MAP: Record<string, string> = {
  name: "name",
  description: "description",
  createdAt: "createdAt",
};

export default function AssetTypesPage() {
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
    rowSelection,
    setRowSelection,
    selectedIds,
  } = useListPage({ sortFieldMap: SORT_FIELD_MAP, defaultSortBy: "name" });

  // Archived rows are hidden until asked for; without this an archived
  // type could not be found in order to restore it.
  const showArchived = searchParams.get("includeArchived") === "true";

  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      search: searchParam || undefined,
      sortBy: sortByParam,
      sortDir: sortDirParam,
      includeArchived: showArchived || undefined,
    }),
    [page, pageSize, searchParam, sortByParam, sortDirParam, showArchived],
  );

  const { data: pagedResult, isLoading, isError } = usePagedAssetTypes(queryParams);
  const createMutation = useCreateAssetType();
  const updateMutation = useUpdateAssetType();
  const archiveMutation = useArchiveAssetType();
  const restoreMutation = useRestoreAssetType();
  const bulkArchiveMutation = useBulkArchiveAssetTypes();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAssetType, setEditingAssetType] = useState<AssetType | null>(null);
  const [archivingAssetType, setArchivingAssetType] = useState<AssetType | null>(
    null,
  );
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);

  // Saved views
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Stable, so the columns memo that depends on it isn't rebuilt every render.
  const handleRestore = useCallback((id: string, name: string) => {
    restoreMutation.mutate(id, {
      onSuccess: () => toast.success(`Restored ${name}`),
      onError: () => toast.error("Failed to restore"),
    });
  }, [restoreMutation]);

  const columns = useMemo(
    () => [
      getSelectionColumn<AssetType>(),
      ...getTypeColumns<AssetType>({
        onEdit: (assetType) => {
          setEditingAssetType(assetType);
          setFormOpen(true);
        },
        onRestore: (assetType) => handleRestore(assetType.id, assetType.name),
        onArchive: (assetType) => {
          setArchivingAssetType(assetType);
        },
      }),
    ],
    [handleRestore],
  );

  function handleBulkArchive() {
    bulkArchiveMutation.mutate(selectedIds, {
      onSuccess: (result) => {
        toast.success(`Archived ${result.succeeded} asset type(s)`);
        setRowSelection({});
        setBulkArchiveOpen(false);
      },
      onError: () => {
        toast.error("Failed to archive asset types");
        setBulkArchiveOpen(false);
      },
    });
  }

  // The saved-view plumbing shared with every other list page. This page kept a
  // near-copy of it, including the one-shot effect that applies a default view.
  const { activeViewId, applyView, handleResetToDefault, getCurrentConfiguration } =
    useSavedViewState({
      entityType: "asset-types",
      filterKeys: SAVED_VIEW_FILTER_KEYS,
      defaultSortBy: "name",
      defaultSortDir: "asc",
      searchParams,
      setSearchParams,
      setSearchInput,
      columnVisibility,
      setColumnVisibility,
      pageSize,
    });

  function handleFormSubmit(values: AssetTypeFormValues) {
    const customFields = (values.customFields ?? []).map((cf, i) => ({
      id: cf.id || undefined,
      name: cf.name,
      fieldType: cf.fieldType,
      options: cf.options || null,
      isRequired: cf.isRequired,
      sortOrder: i,
    }));

    const data = {
      name: values.name,
      description: values.description || null,
      defaultDepreciationMonths: values.defaultDepreciationMonths
        ? parseInt(values.defaultDepreciationMonths, 10)
        : null,
      nameTemplate: values.nameTemplate || null,
      customFields,
    };

    if (editingAssetType) {
      updateMutation.mutate(
        { id: editingAssetType.id, data: { ...data, entityVersion: editingAssetType.entityVersion } },
        {
          onSuccess: () => {
            toast.success("Asset type updated");
            setFormOpen(false);
            setEditingAssetType(null);
          },
          onError: (err) => {
            toast.error(errorMessage(err, "Failed to update asset type"));
          },
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Asset type created");
          setFormOpen(false);
        },
        onError: () => {
          toast.error("Failed to create asset type");
        },
      });
    }
  }

  function handleArchive() {
    if (!archivingAssetType) return;
    archiveMutation.mutate(archivingAssetType.id, {
      onSuccess: () => {
        toast.success("Asset type deleted");
        setArchivingAssetType(null);
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, "Failed to delete asset type"));
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Asset Types" />
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
        <PageHeader title="Asset Types" />
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load asset types. Is the API running?
        </div>
      </div>
    );
  }

  const totalCount = pagedResult?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Types"
        breadcrumbs={[{ label: "Assets", href: "/assets" }, { label: "Asset Types" }]}
        description="Manage categories for your assets."
        actions={
          <div className="flex items-center gap-3">
            {!isLoading && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {totalCount}
              </span>
            )}
            {canWrite && (
              <Button
                onClick={() => {
                  setEditingAssetType(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Asset Type
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
        manualPagination
        manualSorting
        pageCount={pageCount}
        rowCount={totalCount}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(row) => row.id}
        toolbar={(table) => (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TypesToolbar
                showArchived={showArchived}
                onShowArchivedChange={(v) =>
                  setSearchParams((prev) => {
                    if (v) prev.set("includeArchived", "true");
                    else prev.delete("includeArchived");
                    prev.set("page", "1");
                    return prev;
                  })
                }
                table={table}
                search={searchInput}
                onSearchChange={setSearchInput}
                placeholder="Search asset types…"
              />
              <SavedViewSelector
                entityType="asset-types"
                activeViewId={activeViewId}
                onApplyView={applyView}
                onResetToDefault={handleResetToDefault}
                getCurrentConfiguration={getCurrentConfiguration}
              />
            </div>
            <BulkActionBar selectedCount={selectedIds.length} onClearSelection={() => setRowSelection({})}>
              <Button variant="destructive" size="sm" onClick={() => setBulkArchiveOpen(true)}>
                <Trash2 className="mr-1 h-3 w-3" />Archive
              </Button>
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
      />

      <TypeFormDialog<AssetTypeFormValues, AssetType>
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingAssetType(null);
        }}
        entity={editingAssetType}
        entityLabel="Asset Type"
        categoryNoun="asset"
        namePlaceholder="e.g. Laptop"
        schema={assetTypeSchema}
        buildValues={(t) => ({
          name: t?.name ?? "",
          description: t?.description ?? "",
          defaultDepreciationMonths:
            t?.defaultDepreciationMonths != null
              ? String(t.defaultDepreciationMonths)
              : "",
          nameTemplate: t?.nameTemplate ?? "",
          customFields: mapCustomFieldsToForm(t?.customFields),
        })}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
        renderNameAdjacent={(form) => (
          <FormField
            control={form.control}
            name="defaultDepreciationMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">
                  Default Depreciation (months)
                </FormLabel>
                <FormControl>
                  <Input type="number" min="1" step="1" placeholder="e.g. 36" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        renderExtraFields={(form) => (
          <FormField
            control={form.control}
            name="nameTemplate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">Name Template</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. COAD-%SERIALNUMBER%" {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Auto-generates asset names. Variables: %SERIALNUMBER%, %ASSETTYPENAME%
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      />

      <ConfirmDialog
        open={!!archivingAssetType}
        onOpenChange={(open) => {
          if (!open) setArchivingAssetType(null);
        }}
        title="Delete asset type"
        description={`Are you sure you want to delete "${archivingAssetType?.name}"? This action can be undone later.`}
        confirmLabel="Delete"
        onConfirm={handleArchive}
        loading={archiveMutation.isPending}
      />

      <ConfirmDialog
        open={bulkArchiveOpen}
        onOpenChange={setBulkArchiveOpen}
        title="Archive asset types"
        description={`Are you sure you want to archive ${selectedIds.length} asset type(s)? This action can be undone later.`}
        confirmLabel="Archive"
        onConfirm={handleBulkArchive}
        loading={bulkArchiveMutation.isPending}
      />
    </div>
  );
}
