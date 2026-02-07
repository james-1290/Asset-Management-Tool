import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { ConfirmDialog } from "../components/confirm-dialog";
import { AssetFormDialog } from "../components/assets/asset-form-dialog";
import { AssetsToolbar } from "../components/assets/assets-toolbar";
import { getAssetColumns } from "../components/assets/columns";
import {
  useAssets,
  useCreateAsset,
  useUpdateAsset,
  useArchiveAsset,
} from "../hooks/use-assets";
import { useAssetTypes } from "../hooks/use-asset-types";
import { useLocations } from "../hooks/use-locations";
import type { Asset } from "../types/asset";
import type { ColumnFiltersState } from "@tanstack/react-table";
import type { AssetFormValues } from "../lib/schemas/asset";

export default function AssetsPage() {
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get("status");

  const initialColumnFilters: ColumnFiltersState = useMemo(() => {
    if (statusParam) return [{ id: "status", value: statusParam }];
    return [];
  }, [statusParam]);

  const { data: assets, isLoading, isError } = useAssets();
  const { data: assetTypes } = useAssetTypes();
  const { data: locations } = useLocations();
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const archiveMutation = useArchiveAsset();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [archivingAsset, setArchivingAsset] = useState<Asset | null>(null);

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
      }),
    [],
  );

  function handleFormSubmit(values: AssetFormValues) {
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
        data={assets ?? []}
        initialColumnFilters={initialColumnFilters}
        toolbar={(table) => <AssetsToolbar table={table} />}
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
