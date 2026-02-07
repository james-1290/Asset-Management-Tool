import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { ConfirmDialog } from "../components/confirm-dialog";
import { AssetTypeFormDialog } from "../components/asset-types/asset-type-form-dialog";
import { AssetTypesToolbar } from "../components/asset-types/asset-types-toolbar";
import { getAssetTypeColumns } from "../components/asset-types/columns";
import {
  useAssetTypes,
  useCreateAssetType,
  useUpdateAssetType,
  useArchiveAssetType,
} from "../hooks/use-asset-types";
import type { AssetType } from "../types/asset-type";
import type { AssetTypeFormValues } from "../lib/schemas/asset-type";

export default function AssetTypesPage() {
  const { data: assetTypes, isLoading, isError } = useAssetTypes();
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
        data={assetTypes ?? []}
        toolbar={(table) => <AssetTypesToolbar table={table} />}
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
