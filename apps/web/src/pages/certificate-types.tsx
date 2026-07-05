import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "../lib/api-client";
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
  usePagedCertificateTypes,
  useCreateCertificateType,
  useUpdateCertificateType,
  useArchiveCertificateType,
  useBulkArchiveCertificateTypes,
} from "../hooks/use-certificate-types";
import { getSelectionColumn } from "../components/data-table-selection-column";
import { BulkActionBar } from "../components/bulk-action-bar";
import type { CertificateType } from "../types/certificate-type";
import { certificateTypeSchema, type CertificateTypeFormValues } from "../lib/schemas/certificate-type";
import { SavedViewSelector } from "../components/saved-view-selector";
import { useSavedViews } from "../hooks/use-saved-views";
import type { SavedView, ViewConfiguration } from "../types/saved-view";

const SORT_FIELD_MAP: Record<string, string> = {
  name: "name",
  description: "description",
  createdAt: "createdAt",
};

export default function CertificateTypesPage() {
  const {
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
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);

  // Saved views
  const { data: savedViews = [] } = useSavedViews("certificate-types");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const defaultViewApplied = useRef(false);

  const columns = useMemo(
    () => [
      getSelectionColumn<CertificateType>(),
      ...getTypeColumns<CertificateType>({
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
  }, [setSearchParams, setSearchInput]);

  // Apply default saved view on first load. Applying the default view setStates
  // synchronously here, which is the intended one-shot sync.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (defaultViewApplied.current || savedViews.length === 0) return;
    defaultViewApplied.current = true;
    const defaultView = savedViews.find((v) => v.isDefault);
    if (defaultView) applyView(defaultView);
  }, [savedViews, applyView]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
        breadcrumbs={[{ label: "Certificates", href: "/certificates" }, { label: "Certificate Types" }]}
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
              <TypesToolbar
                table={table}
                search={searchInput}
                onSearchChange={setSearchInput}
                placeholder="Search certificate types…"
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

      <TypeFormDialog<CertificateTypeFormValues, CertificateType>
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingCertificateType(null);
        }}
        entity={editingCertificateType}
        entityLabel="Certificate Type"
        categoryNoun="certificate"
        namePlaceholder="e.g. SSL/TLS"
        schema={certificateTypeSchema}
        buildValues={(t) => ({
          name: t?.name ?? "",
          description: t?.description ?? "",
          customFields: mapCustomFieldsToForm(t?.customFields),
        })}
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
