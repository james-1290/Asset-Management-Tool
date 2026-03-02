import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { ConfirmDialog } from "../components/confirm-dialog";
import {
  AssetModelFormDialog,
  type ModelFormValues,
} from "../components/asset-models/asset-model-form-dialog";
import { getAssetModelColumns } from "../components/asset-models/columns";
import {
  useAssetModels,
  useCreateAssetModel,
  useUpdateAssetModel,
  useArchiveAssetModel,
} from "../hooks/use-asset-models";
import { useAssetTypes } from "../hooks/use-asset-types";
import type { AssetModel } from "../types/asset-model";

export default function AssetModelsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterTypeId = searchParams.get("typeId") ?? "";

  const { data: assetTypes } = useAssetTypes();
  const { data: models, isLoading, isError } = useAssetModels(
    filterTypeId || undefined,
  );

  const createMutation = useCreateAssetModel();
  const updateMutation = useUpdateAssetModel();
  const archiveMutation = useArchiveAssetModel();

  const [formOpen, setFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AssetModel | null>(null);
  const [archivingModel, setArchivingModel] = useState<AssetModel | null>(null);

  const columns = useMemo(
    () =>
      getAssetModelColumns({
        onEdit: (model) => {
          setEditingModel(model);
          setFormOpen(true);
        },
        onArchive: (model) => {
          setArchivingModel(model);
        },
      }),
    [],
  );

  function handleFormSubmit(values: ModelFormValues) {
    if (editingModel) {
      updateMutation.mutate(
        {
          id: editingModel.id,
          data: {
            name: values.name,
            manufacturer: values.manufacturer || null,
          },
        },
        {
          onSuccess: () => {
            toast.success("Model updated");
            setFormOpen(false);
            setEditingModel(null);
          },
          onError: () => {
            toast.error("Failed to update model");
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          assetTypeId: values.assetTypeId,
          name: values.name,
          manufacturer: values.manufacturer || null,
        },
        {
          onSuccess: () => {
            toast.success("Model created");
            setFormOpen(false);
          },
          onError: () => {
            toast.error("Failed to create model");
          },
        },
      );
    }
  }

  function handleArchive() {
    if (!archivingModel) return;
    archiveMutation.mutate(archivingModel.id, {
      onSuccess: () => {
        toast.success("Model deleted");
        setArchivingModel(null);
      },
      onError: () => {
        toast.error("Failed to delete model");
      },
    });
  }

  function handleTypeFilterChange(value: string) {
    setSearchParams((prev) => {
      if (value === "all") {
        prev.delete("typeId");
      } else {
        prev.set("typeId", value);
      }
      return prev;
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Asset Models" />
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
        <PageHeader title="Asset Models" />
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load models. Is the API running?
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Models"
        breadcrumbs={[{ label: "Assets", href: "/assets" }, { label: "Asset Models" }]}
        description="Manage hardware models with manufacturer info and images."
        actions={
          <div className="flex items-center gap-3">
            {models && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {models.length}
              </span>
            )}
            <Button
              onClick={() => {
                setEditingModel(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Model
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={models ?? []}
        variant="borderless"
        getRowId={(row) => row.id}
        toolbar={() => (
          <div className="flex items-center gap-2">
            <Select
              value={filterTypeId || "all"}
              onValueChange={handleTypeFilterChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All asset types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Asset Types</SelectItem>
                {(assetTypes ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      />

      <AssetModelFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingModel(null);
        }}
        model={editingModel}
        assetTypes={assetTypes ?? []}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archivingModel}
        onOpenChange={(open) => {
          if (!open) setArchivingModel(null);
        }}
        title="Delete model"
        description={`Are you sure you want to delete "${archivingModel?.name}"? This action can be undone later.`}
        confirmLabel="Delete"
        onConfirm={handleArchive}
        loading={archiveMutation.isPending}
      />
    </div>
  );
}
