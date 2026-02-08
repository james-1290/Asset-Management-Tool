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
import { ApplicationTypeFormDialog } from "../components/application-types/application-type-form-dialog";
import { ApplicationTypesToolbar } from "../components/application-types/application-types-toolbar";
import { getApplicationTypeColumns } from "../components/application-types/columns";
import {
  usePagedApplicationTypes,
  useCreateApplicationType,
  useUpdateApplicationType,
  useArchiveApplicationType,
} from "../hooks/use-application-types";
import type { ApplicationType } from "../types/application-type";
import type { ApplicationTypeFormValues } from "../lib/schemas/application-type";
import { SavedViewSelector } from "../components/saved-view-selector";
import { useSavedViews } from "../hooks/use-saved-views";
import type { SavedView, ViewConfiguration } from "../types/saved-view";

const SORT_FIELD_MAP: Record<string, string> = {
  name: "name",
  description: "description",
  createdAt: "createdAt",
};

export default function ApplicationTypesPage() {
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

  const { data: pagedResult, isLoading, isError } = usePagedApplicationTypes(queryParams);
  const createMutation = useCreateApplicationType();
  const updateMutation = useUpdateApplicationType();
  const archiveMutation = useArchiveApplicationType();

  const [formOpen, setFormOpen] = useState(false);
  const [editingApplicationType, setEditingApplicationType] = useState<ApplicationType | null>(null);
  const [archivingApplicationType, setArchivingApplicationType] = useState<ApplicationType | null>(null);

  // Saved views
  const { data: savedViews = [] } = useSavedViews("application-types");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const defaultViewApplied = useRef(false);

  const columns = useMemo(
    () =>
      getApplicationTypeColumns({
        onEdit: (applicationType) => {
          setEditingApplicationType(applicationType);
          setFormOpen(true);
        },
        onArchive: (applicationType) => {
          setArchivingApplicationType(applicationType);
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

  function handleFormSubmit(values: ApplicationTypeFormValues) {
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

    if (editingApplicationType) {
      updateMutation.mutate(
        { id: editingApplicationType.id, data },
        {
          onSuccess: () => {
            toast.success("Application type updated");
            setFormOpen(false);
            setEditingApplicationType(null);
          },
          onError: () => {
            toast.error("Failed to update application type");
          },
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Application type created");
          setFormOpen(false);
        },
        onError: () => {
          toast.error("Failed to create application type");
        },
      });
    }
  }

  function handleArchive() {
    if (!archivingApplicationType) return;
    archiveMutation.mutate(archivingApplicationType.id, {
      onSuccess: () => {
        toast.success("Application type deleted");
        setArchivingApplicationType(null);
      },
      onError: () => {
        toast.error("Failed to delete application type");
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Application Types" />
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
        <PageHeader title="Application Types" />
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load application types. Is the API running?
        </div>
      </div>
    );
  }

  const totalCount = pagedResult?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Application Types"
        description="Manage categories for your applications and licences."
        actions={
          <Button
            onClick={() => {
              setEditingApplicationType(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Application Type
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
            <ApplicationTypesToolbar
              table={table}
              search={searchInput}
              onSearchChange={setSearchInput}
            />
            <SavedViewSelector
              entityType="application-types"
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

      <ApplicationTypeFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingApplicationType(null);
        }}
        applicationType={editingApplicationType}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archivingApplicationType}
        onOpenChange={(open) => {
          if (!open) setArchivingApplicationType(null);
        }}
        title="Delete application type"
        description={`Are you sure you want to delete "${archivingApplicationType?.name}"? This action can be undone later.`}
        confirmLabel="Delete"
        onConfirm={handleArchive}
        loading={archiveMutation.isPending}
      />
    </div>
  );
}
