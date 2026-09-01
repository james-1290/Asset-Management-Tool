import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Archive, RefreshCw } from "lucide-react";
import type { VisibilityState } from "@tanstack/react-table";
import { useListPage } from "../hooks/use-list-page";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { DataTablePagination } from "../components/data-table-pagination";
import { certificatesApi } from "../lib/api/certificates";
import { getApiErrorMessage, errorMessage} from "../lib/api-client";
import { ExportButton } from "../components/export-button";
import { ConfirmDialog } from "../components/confirm-dialog";
import { CertificateFormDialog } from "../components/certificates/certificate-form-dialog";
import { CertificatesToolbar } from "../components/certificates/certificates-toolbar";
import { getCertificateColumns } from "../components/certificates/columns";
import { ViewModeToggle } from "../components/view-mode-toggle";
import { GroupedGridView } from "../components/grouped-grid-view";
import { CertificateCard } from "../components/certificates/certificate-card";
import {
  usePagedCertificates,
  useCreateCertificate,
  useUpdateCertificate,
  useArchiveCertificate,
  useRestoreCertificate,
  useBulkArchiveCertificates,
  useBulkStatusCertificates,
  useCheckCertificateDuplicates,
} from "../hooks/use-certificates";
import { getSelectionColumn } from "../components/data-table-selection-column";
import { BulkActionBar } from "../components/bulk-action-bar";
import { useCertificateTypes } from "../hooks/use-certificate-types";
import { useLocations } from "../hooks/use-locations";
import type { Certificate } from "../types/certificate";
import type { CertificateFormValues } from "../lib/schemas/certificate";
import { SavedViewSelector } from "../components/saved-view-selector";
import { ArchivedToggle } from "@/components/archived-toggle";
import { useSavedViewState } from "../hooks/use-saved-view-state";
import type { DuplicateCheckResult } from "../types/duplicate-check";
import { DuplicateWarningDialog } from "../components/shared/duplicate-warning-dialog";
import { ActiveFilterChips } from "../components/filters/active-filter-chips";
import type { ActiveFilter } from "../components/filters/active-filter-chips";
import { useAuth } from "@/contexts/auth-context";

const SORT_FIELD_MAP: Record<string, string> = {
  name: "name",
  certificateTypeName: "certificateTypeName",
  issuer: "issuer",
  expiryDate: "expiryDate",
  status: "status",
};

/** Filter params this list stores in a saved view. */
const SAVED_VIEW_FILTER_KEYS = ["expiryFrom", "expiryTo"] as const;

export default function CertificatesPage() {
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

  const statusParam = searchParams.get("status") ?? "";
  const typeIdParam = searchParams.get("typeId") ?? "";
  const viewMode = (searchParams.get("viewMode") as "list" | "grouped") || "list";
  // Archived rows are hidden until asked for; this is what makes a
  // soft-deleted record findable again so it can be restored.
  const showArchived = searchParams.get("includeArchived") === "true";
  const expiryFromParam = searchParams.get("expiryFrom") ?? "";
  const expiryToParam = searchParams.get("expiryTo") ?? "";

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

  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      search: searchParam || undefined,
      status: statusParam || undefined,
      sortBy: sortByParam,
      sortDir: sortDirParam,
      typeId: typeIdParam || undefined,
      expiryFrom: expiryFromParam || undefined,
      expiryTo: expiryToParam || undefined,
      includeArchived: showArchived || undefined,
    }),
    [page, pageSize, searchParam, statusParam, sortByParam, sortDirParam, typeIdParam, expiryFromParam, expiryToParam, showArchived],
  );

  const { data: pagedResult, isLoading, isError } = usePagedCertificates(queryParams);
  const { data: certificateTypes } = useCertificateTypes();
  const { data: locations } = useLocations();
  const createMutation = useCreateCertificate();
  const checkDuplicatesMutation = useCheckCertificateDuplicates();
  const updateMutation = useUpdateCertificate();
  const archiveMutation = useArchiveCertificate();
  const restoreMutation = useRestoreCertificate();
  const bulkArchiveMutation = useBulkArchiveCertificates();
  const bulkStatusMutation = useBulkStatusCertificates();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);
  const [archivingCertificate, setArchivingCertificate] = useState<Certificate | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    duplicates: DuplicateCheckResult[];
    onConfirm: () => void;
  } | null>(null);
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);

  // Saved views
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const { activeViewId, applyView, handleResetToDefault, getCurrentConfiguration } =
    useSavedViewState({
      entityType: "certificates",
      filterKeys: SAVED_VIEW_FILTER_KEYS,
      defaultSortBy: "name",
      searchParams,
      setSearchParams,
      setSearchInput,
      columnVisibility,
      setColumnVisibility,
      pageSize,
    });

  // Stable, so the columns memo that depends on it isn't rebuilt every render.
  const handleRestore = useCallback((id: string, name: string) => {
    restoreMutation.mutate(id, {
      onSuccess: () => toast.success(`Restored ${name}`),
      onError: (error) => toast.error(getApiErrorMessage(error, "Failed to restore")),
    });
  }, [restoreMutation]);

  const columns = useMemo(
    () => [
      getSelectionColumn<Certificate>(),
      ...getCertificateColumns({
        canWrite,
        onEdit: (certificate) => {
          setEditingCertificate(certificate);
          setFormOpen(true);
        },
        onArchive: (certificate) => {
          setArchivingCertificate(certificate);
        },
        onRestore: (certificate) => handleRestore(certificate.id, certificate.name),
      }),
    ],
    [canWrite, handleRestore],
  );


  const activeFilters = useMemo(() => {
    const filters: ActiveFilter[] = [];
    if (expiryFromParam || expiryToParam) {
      filters.push({ key: "expiry", label: `Expiry: ${expiryFromParam || "..."} \u2013 ${expiryToParam || "..."}`, onRemove: () => { handleFilterChange("expiryFrom", ""); handleFilterChange("expiryTo", ""); } });
    }
    return filters;
  }, [expiryFromParam, expiryToParam, handleFilterChange]);

  const handleClearAllFilters = useCallback(() => {
    setSearchParams((prev) => {
      ["expiryFrom", "expiryTo"].forEach(k => prev.delete(k));
      prev.set("page", "1");
      return prev;
    });
  }, [setSearchParams]);

  const [exporting, setExporting] = useState(false);
  async function handleExport() {
    setExporting(true);
    try {
      await certificatesApi.exportCsv({
        search: searchParam || undefined,
        status: statusParam || undefined,
        sortBy: sortByParam,
        sortDir: sortDirParam,
        typeId: typeIdParam || undefined,
        expiryFrom: expiryFromParam || undefined,
        expiryTo: expiryToParam || undefined,
        ids: selectedIds.length > 0 ? selectedIds.join(",") : undefined,
      });
    } catch {
      toast.error("Failed to export certificates");
    } finally {
      setExporting(false);
    }
  }

  function handleFormSubmit(values: CertificateFormValues) {
    const customFieldValues = Object.entries(values.customFieldValues ?? {})
      .filter(([, v]) => v != null && v !== "" && v !== "__none__")
      .map(([fieldDefinitionId, value]) => ({
        fieldDefinitionId,
        value: value!,
      }));

    const data = {
      name: values.name,
      certificateTypeId: values.certificateTypeId,
      issuer: values.issuer || null,
      subject: values.subject || null,
      thumbprint: values.thumbprint || null,
      serialNumber: values.serialNumber || null,
      issuedDate: values.issuedDate ? values.issuedDate : null,
      expiryDate: values.expiryDate ? values.expiryDate : null,
      status: values.status || "Active",
      autoRenewal: values.autoRenewal ?? false,
      notes: values.notes || null,
      assetId: values.assetId && values.assetId !== "none" ? values.assetId : null,
      personId: values.personId && values.personId !== "none" ? values.personId : null,
      locationId: values.locationId && values.locationId !== "none" ? values.locationId : null,
      customFieldValues,
    };

    if (editingCertificate) {
      updateMutation.mutate(
        { id: editingCertificate.id, data: { ...data, entityVersion: editingCertificate.entityVersion } },
        {
          onSuccess: () => {
            toast.success("Certificate updated");
            setFormOpen(false);
            setEditingCertificate(null);
          },
          onError: (err) => {
            toast.error(errorMessage(err, "Failed to update certificate"));
          },
        },
      );
    } else {
      const doCreate = () => {
        createMutation.mutate(data, {
          onSuccess: () => {
            toast.success("Certificate created");
            setFormOpen(false);
            setDuplicateWarning(null);
          },
          onError: (error) => {
            toast.error(getApiErrorMessage(error, "Failed to create certificate"));
          },
        });
      };

      checkDuplicatesMutation.mutate(
        {
          name: data.name,
          thumbprint: data.thumbprint || undefined,
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
    if (!archivingCertificate) return;
    archiveMutation.mutate(archivingCertificate.id, {
      onSuccess: () => {
        toast.success("Certificate deleted");
        setArchivingCertificate(null);
      },
      onError: () => {
        toast.error("Failed to delete certificate");
      },
    });
  }

  const selectedCount = selectedIds.length;

  function handleBulkArchive() {
    bulkArchiveMutation.mutate(selectedIds, {
      onSuccess: (result) => {
        toast.success(`Archived ${result.succeeded} certificate(s)`);
        setRowSelection({});
        setBulkArchiveOpen(false);
      },
      onError: () => {
        toast.error("Failed to archive certificates");
        setBulkArchiveOpen(false);
      },
    });
  }

  function handleBulkStatus(status: string) {
    bulkStatusMutation.mutate({ ids: selectedIds, status }, {
      onSuccess: (result) => {
        toast.success(`Updated ${result.succeeded} certificate(s) to ${status}`);
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
        <PageHeader title="Certificates" />
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
        <PageHeader title="Certificates" />
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load certificates. Is the API running?
        </div>
      </div>
    );
  }

  const totalCount = pagedResult?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificates"
        breadcrumbs={[{ label: "Certificates", href: "/certificates" }, { label: "Certificates" }]}
        description="Track SSL/TLS certificates, secrets, and renewal dates."
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
                  setEditingCertificate(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Certificate
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
        getRowId={(row: Certificate) => row.id}
        manualPagination
        manualSorting
        pageCount={pageCount}
        rowCount={totalCount}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        toolbar={(table) => (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <CertificatesToolbar
                table={table}
                search={searchInput}
                onSearchChange={setSearchInput}
                statusFilter={statusParam}
                onStatusFilterChange={handleStatusFilterChange}
                typeId={typeIdParam}
                onTypeIdChange={handleTypeIdChange}
                certificateTypes={certificateTypes ?? []}
                expiryFrom={expiryFromParam}
                expiryTo={expiryToParam}
                onExpiryFromChange={(v) => handleFilterChange("expiryFrom", v)}
                onExpiryToChange={(v) => handleFilterChange("expiryTo", v)}
              />
              <div className="flex items-center gap-1.5">
                <ArchivedToggle
                  showArchived={showArchived}
                  onShowArchivedChange={(v) => handleFilterChange("includeArchived", v ? "true" : "")}
                />
                <SavedViewSelector
                  entityType="certificates"
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
              canWrite={canWrite}
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
              {["Active", "Expired", "Revoked", "PendingRenewal"].map((s) => (
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
            groupByKey="certificateTypeName"
            renderItem={(cert) => (
              <CertificateCard
                key={cert.id}
                certificate={cert}
                onEdit={(c) => { setEditingCertificate(c); setFormOpen(true); }}
                onArchive={(c) => setArchivingCertificate(c)}
              />
            )}
          />
        )}
      </DataTable>

      <CertificateFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingCertificate(null);
        }}
        certificate={editingCertificate}
        certificateTypes={certificateTypes ?? []}
        locations={locations ?? []}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending || checkDuplicatesMutation.isPending}
      />

      <ConfirmDialog
        open={!!archivingCertificate}
        onOpenChange={(open) => {
          if (!open) setArchivingCertificate(null);
        }}
        title="Delete certificate"
        description={`Are you sure you want to delete "${archivingCertificate?.name}"? This action can be undone later.`}
        confirmLabel="Delete"
        onConfirm={handleArchive}
        loading={archiveMutation.isPending}
      />

      <ConfirmDialog
        open={bulkArchiveOpen}
        onOpenChange={setBulkArchiveOpen}
        title="Archive selected certificates"
        description={`Are you sure you want to archive ${selectedCount} certificate(s)? This action can be undone later.`}
        confirmLabel="Archive"
        onConfirm={handleBulkArchive}
        loading={bulkArchiveMutation.isPending}
      />

      {duplicateWarning && (
        <DuplicateWarningDialog
          open={true}
          onOpenChange={(open) => { if (!open) setDuplicateWarning(null); }}
          duplicates={duplicateWarning.duplicates}
          entityType="certificates"
          onCreateAnyway={duplicateWarning.onConfirm}
          loading={createMutation.isPending}
        />
      )}
    </div>
  );
}
