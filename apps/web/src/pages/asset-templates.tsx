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
  AssetTemplateFormDialog,
  type TemplateFormValues,
} from "../components/asset-templates/asset-template-form-dialog";
import { getAssetTemplateColumns } from "../components/asset-templates/columns";
import {
  useAssetTemplates,
  useCreateAssetTemplate,
  useUpdateAssetTemplate,
  useArchiveAssetTemplate,
} from "../hooks/use-asset-templates";
import { useAssetTypes } from "../hooks/use-asset-types";
import { useLocations } from "../hooks/use-locations";
import type { AssetTemplate } from "../types/asset-template";

export default function AssetTemplatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterTypeId = searchParams.get("typeId") ?? "";

  const { data: assetTypes } = useAssetTypes();
  const { data: locations } = useLocations();
  const { data: templates, isLoading, isError } = useAssetTemplates(
    filterTypeId || undefined,
  );

  const createMutation = useCreateAssetTemplate();
  const updateMutation = useUpdateAssetTemplate();
  const archiveMutation = useArchiveAssetTemplate();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AssetTemplate | null>(
    null,
  );
  const [archivingTemplate, setArchivingTemplate] =
    useState<AssetTemplate | null>(null);

  const columns = useMemo(
    () =>
      getAssetTemplateColumns({
        onEdit: (template) => {
          setEditingTemplate(template);
          setFormOpen(true);
        },
        onArchive: (template) => {
          setArchivingTemplate(template);
        },
      }),
    [],
  );

  function handleFormSubmit(values: TemplateFormValues) {
    const customFieldValues = Object.entries(values.customFieldValues ?? {})
      .filter(([, v]) => v != null && v !== "" && v !== "__none__")
      .map(([fieldDefinitionId, value]) => ({
        fieldDefinitionId,
        value: value!,
      }));

    if (editingTemplate) {
      updateMutation.mutate(
        {
          id: editingTemplate.id,
          data: {
            name: values.name,
            purchaseCost: values.purchaseCost
              ? parseFloat(values.purchaseCost)
              : null,
            depreciationMonths: values.depreciationMonths
              ? parseInt(values.depreciationMonths, 10)
              : null,
            locationId:
              values.locationId && values.locationId !== "__none__"
                ? values.locationId
                : null,
            notes: values.notes || null,
            customFieldValues,
          },
        },
        {
          onSuccess: () => {
            toast.success("Template updated");
            setFormOpen(false);
            setEditingTemplate(null);
          },
          onError: () => {
            toast.error("Failed to update template");
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          assetTypeId: values.assetTypeId,
          name: values.name,
          purchaseCost: values.purchaseCost
            ? parseFloat(values.purchaseCost)
            : null,
          depreciationMonths: values.depreciationMonths
            ? parseInt(values.depreciationMonths, 10)
            : null,
          locationId:
            values.locationId && values.locationId !== "__none__"
              ? values.locationId
              : null,
          notes: values.notes || null,
          customFieldValues,
        },
        {
          onSuccess: () => {
            toast.success("Template created");
            setFormOpen(false);
          },
          onError: () => {
            toast.error("Failed to create template");
          },
        },
      );
    }
  }

  function handleArchive() {
    if (!archivingTemplate) return;
    archiveMutation.mutate(archivingTemplate.id, {
      onSuccess: () => {
        toast.success("Template deleted");
        setArchivingTemplate(null);
      },
      onError: () => {
        toast.error("Failed to delete template");
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
        <PageHeader title="Asset Templates" />
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
        <PageHeader title="Asset Templates" />
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load templates. Is the API running?
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Templates"
        description="Saved presets for quickly creating assets with pre-filled fields."
        actions={
          <div className="flex items-center gap-3">
            {templates && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {templates.length}
              </span>
            )}
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Template
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={templates ?? []}
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

      <AssetTemplateFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingTemplate(null);
        }}
        template={editingTemplate}
        assetTypes={assetTypes ?? []}
        locations={locations ?? []}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archivingTemplate}
        onOpenChange={(open) => {
          if (!open) setArchivingTemplate(null);
        }}
        title="Delete template"
        description={`Are you sure you want to delete "${archivingTemplate?.name}"? This action can be undone later.`}
        confirmLabel="Delete"
        onConfirm={handleArchive}
        loading={archiveMutation.isPending}
      />
    </div>
  );
}
