import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getApiErrorMessage } from "../lib/api-client";
import { Plus, Trash2 } from "lucide-react";
import type { SortingState, VisibilityState, RowSelectionState } from "@tanstack/react-table";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { DataTablePagination } from "../components/data-table-pagination";
import { ConfirmDialog } from "../components/confirm-dialog";
import { CertificateTypeFormDialog } from "../components/certificate-types/certificate-type-form-dialog";
import { CertificateTypesToolbar } from "../components/certificate-types/certificate-types-toolbar";
import { getCertificateTypeColumns } from "../components/certificate-types/columns";
import {
  usePagedCertificateTypes,
  useCreateCertificateType,
  useUpdateCertificateType,
  useArchiveCertificateType,
  useBulkArchiveCertificateTypes,
} from "../hooks/use-certificate-types";
import { getSelectionColumn } from "../components/data-table-selection-column";
import { BulkActionBar } from "../components/bulk-action-bar";
import type { CertificateType } from "../types/certificate-type";
import type { CertificateTypeFormValues } from "../lib/schemas/certificate-type";
import { SavedViewSelector } from "../components/saved-view-selector";
import { useSavedViews } from "../hooks/use-saved-views";
import type { SavedView, ViewConfiguration } from "../types/saved-view";

const SORT_FIELD_MAP: Record<string, string> = {
  name: "name",
  description: "description",
  createdAt: "createdAt",
};

export default function CertificateTypesPage() {
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

  const { data: pagedResult, isLoading, isError } = usePagedCertificateTypes(queryParams);
  const createMutation = useCreateCertificateType();
  const updateMutation = useUpdateCertificateType();
  const archiveMutation = useArchiveCertificateType();
  const bulkArchiveMutation = useBulkArchiveCertificateTypes();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCertificateType, setEditingCertificateType] = useState<CertificateType | null>(null);
  const [archivingCertificateType, setArchivingCertificateType] = useState<CertificateType | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);

  // Saved views
  const { data: savedViews = [] } = useSavedViews("certificate-types");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const defaultViewApplied = useRef(false);

  const columns = useMemo(
    () => [
      getSelectionColumn<CertificateType>(),
      ...getCertificateTypeColumns({
        onEdit: (certificateType) => {
          setEditingCertificateType(certificateType);
          setFormOpen(true);
        },
        onArchive: (certificateType) => {
          setArchivingCertificateType(certificateType);
        },
      }),
    ],
    [],
  );

  const selectedIds = Object.keys(rowSelection);

  function handleBulkArchive() {
    bulkArchiveMutation.mutate(selectedIds, {
      onSuccess: (result) => {
        toast.success(`Archived ${result.succeeded} certificate type(s)`);
        setRowSelection({});
        setBulkArchiveOpen(false);
      },
      onError: () => {
        toast.error("Failed to archive certificate types");
        setBulkArchiveOpen(false);
      },
    });
  }

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
      prev.set("sortBy", "name");
      prev.set("sortDir", "asc");
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

  function handleFormSubmit(values: CertificateTypeFormValues) {
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

    if (editingCertificateType) {
      updateMutation.mutate(
        { id: editingCertificateType.id, data },
        {
          onSuccess: () => {
            toast.success("Certificate type updated");
            setFormOpen(false);
            setEditingCertificateType(null);
          },
          onError: () => {
            toast.error("Failed to update certificate type");
          },
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Certificate type created");
          setFormOpen(false);
        },
        onError: () => {
          toast.error("Failed to create certificate type");
        },
      });
    }
  }

  function handleArchive() {
    if (!archivingCertificateType) return;
    archiveMutation.mutate(archivingCertificateType.id, {
      onSuccess: () => {
        toast.success("Certificate type deleted");
        setArchivingCertificateType(null);
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, "Failed to delete certificate type"));
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Certificate Types" />
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
        <PageHeader title="Certificate Types" />
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load certificate types. Is the API running?
        </div>
      </div>
    );
  }

  const totalCount = pagedResult?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificate Types"
        description="Manage categories for your certificates."
        actions={
          <div className="flex items-center gap-3">
            {!isLoading && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {totalCount}
              </span>
            )}
            <Button
              onClick={() => {
                setEditingCertificateType(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Certificate Type
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
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(row) => row.id}
        toolbar={(table) => (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CertificateTypesToolbar
                table={table}
                search={searchInput}
                onSearchChange={setSearchInput}
              />
              <SavedViewSelector
                entityType="certificate-types"
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

      <CertificateTypeFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingCertificateType(null);
        }}
        certificateType={editingCertificateType}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archivingCertificateType}
        onOpenChange={(open) => {
          if (!open) setArchivingCertificateType(null);
        }}
        title="Delete certificate type"
        description={`Are you sure you want to delete "${archivingCertificateType?.name}"? This action can be undone later.`}
        confirmLabel="Delete"
        onConfirm={handleArchive}
        loading={archiveMutation.isPending}
      />

      <ConfirmDialog
        open={bulkArchiveOpen}
        onOpenChange={setBulkArchiveOpen}
        title="Archive certificate types"
        description={`Are you sure you want to archive ${selectedIds.length} certificate type(s)? This action can be undone later.`}
        confirmLabel="Archive"
        onConfirm={handleBulkArchive}
        loading={bulkArchiveMutation.isPending}
      />
    </div>
  );
}
