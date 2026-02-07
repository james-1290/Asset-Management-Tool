import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { SortingState } from "@tanstack/react-table";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { DataTablePagination } from "../components/data-table-pagination";
import { ConfirmDialog } from "../components/confirm-dialog";
import { AssetTypeFormDialog } from "../components/asset-types/asset-type-form-dialog";
import { AssetTypesToolbar } from "../components/asset-types/asset-types-toolbar";
import { getAssetTypeColumns } from "../components/asset-types/columns";
import {
  usePagedAssetTypes,
  useCreateAssetType,
  useUpdateAssetType,
  useArchiveAssetType,
} from "../hooks/use-asset-types";
import type { AssetType } from "../types/asset-type";
import type { AssetTypeFormValues } from "../lib/schemas/asset-type";

const SORT_FIELD_MAP: Record<string, string> = {
  name: "name",
  description: "description",
  createdAt: "createdAt",
};

export default function AssetTypesPage() {
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

  const { data: pagedResult, isLoading, isError } = usePagedAssetTypes(queryParams);
  const createMutation = useCreateAssetType();
  const updateMutation = useUpdateAssetType();
  const archiveMutation = useArchiveAssetType();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAssetType, setEditingAssetType] = useState<AssetType | null>(null);
  const [archivingAssetType, setArchivingAssetType] = useState<AssetType | null>(
    null,
  );

  const columns = useMemo(
    () =>
      getAssetTypeColumns({
        onEdit: (assetType) => {
          setEditingAssetType(assetType);
          setFormOpen(true);
        },
        onArchive: (assetType) => {
          setArchivingAssetType(assetType);
        },
      }),
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
      customFields,
    };

    if (editingAssetType) {
      updateMutation.mutate(
        { id: editingAssetType.id, data },
        {
          onSuccess: () => {
            toast.success("Asset type updated");
            setFormOpen(false);
            setEditingAssetType(null);
          },
          onError: () => {
            toast.error("Failed to update asset type");
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
      onError: () => {
        toast.error("Failed to delete asset type");
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
        description="Manage categories for your assets."
        actions={
          <Button
            onClick={() => {
              setEditingAssetType(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Asset Type
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={pagedResult?.items ?? []}
        manualPagination
        manualSorting
        pageCount={pageCount}
        rowCount={totalCount}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        toolbar={(table) => (
          <AssetTypesToolbar
            table={table}
            search={searchInput}
            onSearchChange={setSearchInput}
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

      <AssetTypeFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingAssetType(null);
        }}
        assetType={editingAssetType}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
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
    </div>
  );
}
