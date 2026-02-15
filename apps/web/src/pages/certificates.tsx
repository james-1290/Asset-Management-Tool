import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Archive, RefreshCw } from "lucide-react";
import type { SortingState, VisibilityState, RowSelectionState } from "@tanstack/react-table";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { DataTablePagination } from "../components/data-table-pagination";
import { certificatesApi } from "../lib/api/certificates";
import { getApiErrorMessage } from "../lib/api-client";
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
import { useSavedViews } from "../hooks/use-saved-views";
import type { SavedView, ViewConfiguration } from "../types/saved-view";
import type { DuplicateCheckResult } from "../types/duplicate-check";
import { DuplicateWarningDialog } from "../components/shared/duplicate-warning-dialog";
import { ActiveFilterChips } from "../components/filters/active-filter-chips";
import type { ActiveFilter } from "../components/filters/active-filter-chips";
import type { QuickFilter } from "../components/filters/quick-filter-bar";

const SORT_FIELD_MAP: Record<string, string> = {
  name: "name",
  certificateTypeName: "certificateTypeName",
  issuer: "issuer",
  expiryDate: "expiryDate",
  status: "status",
};

export default function CertificatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 25;
  const searchParam = searchParams.get("search") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const sortByParam = searchParams.get("sortBy") ?? "name";
  const sortDirParam = searchParams.get("sortDir") ?? "asc";
  const typeIdParam = searchParams.get("typeId") ?? "";
  const viewMode = (searchParams.get("viewMode") as "list" | "grouped") || "list";
  const expiryFromParam = searchParams.get("expiryFrom") ?? "";
  const expiryToParam = searchParams.get("expiryTo") ?? "";
  const quickFilterParam = searchParams.get("quickFilter") ?? "";

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

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        if (value) prev.set(key, value);
        else prev.delete(key);
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

  const handleQuickFilterApply = useCallback(
    (filter: QuickFilter) => {
      setSearchParams((prev) => {
        const quickKeys = ["expiryFrom", "expiryTo", "status"];
        quickKeys.forEach(k => prev.delete(k));
        for (const [key, value] of Object.entries(filter.params)) {
          prev.set(key, value);
        }
        prev.set("quickFilter", filter.id);
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

  const handleQuickFilterClear = useCallback(() => {
    setSearchParams((prev) => {
      const quickKeys = ["expiryFrom", "expiryTo", "quickFilter"];
      quickKeys.forEach(k => prev.delete(k));
      prev.set("page", "1");
      return prev;
    });
  }, [setSearchParams]);

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
    }),
    [page, pageSize, searchParam, statusParam, sortByParam, sortDirParam, typeIdParam, expiryFromParam, expiryToParam],
  );

  const { data: pagedResult, isLoading, isError } = usePagedCertificates(queryParams);
  const { data: certificateTypes } = useCertificateTypes();
  const { data: locations } = useLocations();
  const createMutation = useCreateCertificate();
  const checkDuplicatesMutation = useCheckCertificateDuplicates();
  const updateMutation = useUpdateCertificate();
  const archiveMutation = useArchiveCertificate();
  const bulkArchiveMutation = useBulkArchiveCertificates();
  const bulkStatusMutation = useBulkStatusCertificates();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);
  const [archivingCertificate, setArchivingCertificate] = useState<Certificate | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    duplicates: DuplicateCheckResult[];
    onConfirm: () => void;
  } | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);

  // Saved views
  const { data: savedViews = [] } = useSavedViews("certificates");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const defaultViewApplied = useRef(false);

  const columns = useMemo(
    () => [
      getSelectionColumn<Certificate>(),
      ...getCertificateColumns({
        onEdit: (certificate) => {
          setEditingCertificate(certificate);
          setFormOpen(true);
        },
        onArchive: (certificate) => {
          setArchivingCertificate(certificate);
        },
      }),
    ],
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
      prev.delete("typeId");
      prev.delete("viewMode");
      prev.delete("expiryFrom");
      prev.delete("expiryTo");
      prev.delete("quickFilter");
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

        // Restore advanced filters
        const filterKeys = ["expiryFrom", "expiryTo", "quickFilter"];
        for (const key of filterKeys) {
          const val = config.filters?.[key];
          if (val) prev.set(key, val);
          else prev.delete(key);
        }

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
    filters: {
      ...(expiryFromParam ? { expiryFrom: expiryFromParam } : {}),
      ...(expiryToParam ? { expiryTo: expiryToParam } : {}),
      ...(quickFilterParam ? { quickFilter: quickFilterParam } : {}),
    },
  }), [columnVisibility, sortByParam, sortDirParam, searchParam, statusParam, typeIdParam, viewMode, pageSize, expiryFromParam, expiryToParam, quickFilterParam]);

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

  const activeFilters = useMemo(() => {
    const filters: ActiveFilter[] = [];
    if (expiryFromParam || expiryToParam) {
      filters.push({ key: "expiry", label: `Expiry: ${expiryFromParam || "..."} \u2013 ${expiryToParam || "..."}`, onRemove: () => { handleFilterChange("expiryFrom", ""); handleFilterChange("expiryTo", ""); } });
    }
    return filters;
  }, [expiryFromParam, expiryToParam, handleFilterChange]);

  const handleClearAllFilters = useCallback(() => {
    setSearchParams((prev) => {
      ["expiryFrom", "expiryTo", "quickFilter"].forEach(k => prev.delete(k));
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
      issuedDate: values.issuedDate ? `${values.issuedDate}T00:00:00Z` : null,
      expiryDate: values.expiryDate ? `${values.expiryDate}T00:00:00Z` : null,
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
        { id: editingCertificate.id, data },
        {
          onSuccess: () => {
            toast.success("Certificate updated");
            setFormOpen(false);
            setEditingCertificate(null);
          },
          onError: () => {
            toast.error("Failed to update certificate");
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

  const selectedIds = Object.keys(rowSelection);
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
      onError: () => {
        toast.error("Failed to update status");
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
        description="Track SSL/TLS certificates, secrets, and renewal dates."
        actions={
          <div className="flex items-center gap-3">
            {!isLoading && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {totalCount}
              </span>
            )}
            <Button
              onClick={() => {
                setEditingCertificate(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Certificate
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
                quickFilter={quickFilterParam}
                onQuickFilterApply={handleQuickFilterApply}
                onQuickFilterClear={handleQuickFilterClear}
              />
              <div className="flex items-center gap-1.5">
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
        loading={createMutation.isPending || updateMutation.isPending}
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
