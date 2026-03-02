import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { assetModelsApi } from "../../lib/api/asset-models";
import { useAssetModelImage, clearAssetModelImageCache } from "../../hooks/use-asset-model-image";
import { useCreateAssetModel, useUpdateAssetModel } from "../../hooks/use-asset-models";
import type { AssetModel } from "../../types/asset-model";
import type { AssetType } from "../../types/asset-type";

const modelSchema = z.object({
  assetTypeId: z.string().min(1, "Asset type is required"),
  name: z.string().min(1, "Name is required").max(255),
  manufacturer: z.string().max(255).optional().or(z.literal("")),
});

type ModelFormValues = z.infer<typeof modelSchema>;

interface AssetModelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model?: AssetModel | null;
  assetTypes: AssetType[];
  defaultAssetTypeId?: string;
  /** Called after a model is successfully created or updated */
  onSaved?: (model: AssetModel) => void;
  /** @deprecated Use onSaved instead. Legacy callback for form submission. */
  onSubmit?: (values: ModelFormValues) => void;
  loading?: boolean;
}

export type { ModelFormValues };

function ImageSection({ model }: { model: AssetModel }) {
  const queryClient = useQueryClient();
  const { src } = useAssetModelImage(model.id, model.imageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setUploading(true);
    try {
      await assetModelsApi.uploadImage(model.id, file);
      clearAssetModelImageCache(model.id);
      queryClient.invalidateQueries({ queryKey: ["asset-models"] });
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setUploading(true);
    try {
      await assetModelsApi.deleteImage(model.id);
      clearAssetModelImageCache(model.id);
      queryClient.invalidateQueries({ queryKey: ["asset-models"] });
      toast.success("Image removed");
    } catch {
      toast.error("Failed to remove image");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Model Image</p>
      <div className="flex items-center gap-4">
        {src ? (
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border">
            <img src={src} alt={model.name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed bg-muted">
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Upload Image"}
          </Button>
          {model.imageUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              className="text-destructive hover:text-destructive"
              onClick={handleRemove}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
          <p className="text-xs text-muted-foreground">JPG, PNG, or GIF. Max 2MB.</p>
        </div>
      </div>
    </div>
  );
}

export function AssetModelFormDialog({
  open,
  onOpenChange,
  model,
  assetTypes,
  onSaved,
  onSubmit,
  loading: externalLoading,
  defaultAssetTypeId,
}: AssetModelFormDialogProps) {
  const isEditing = !!model;
  const createMutation = useCreateAssetModel();
  const updateMutation = useUpdateAssetModel();
  const [createdModel, setCreatedModel] = useState<AssetModel | null>(null);

  const form = useForm<ModelFormValues>({
    resolver: zodResolver(modelSchema),
    defaultValues: {
      assetTypeId: "",
      name: "",
      manufacturer: "",
    },
  });

  useEffect(() => {
    if (open) {
      setCreatedModel(null);
      form.reset({
        assetTypeId: model?.assetTypeId ?? defaultAssetTypeId ?? "",
        name: model?.name ?? "",
        manufacturer: model?.manufacturer ?? "",
      });
    }
  }, [open, model, form, defaultAssetTypeId]);

  const loading = externalLoading || createMutation.isPending || updateMutation.isPending;

  async function handleFormSubmit(values: ModelFormValues) {
    // Legacy path: if parent provided onSubmit, delegate to it
    if (onSubmit) {
      onSubmit(values);
      return;
    }

    try {
      if (isEditing && model) {
        const updated = await updateMutation.mutateAsync({
          id: model.id,
          data: {
            name: values.name,
            manufacturer: values.manufacturer || null,
          },
        });
        toast.success("Model updated");
        onSaved?.(updated);
        onOpenChange(false);
      } else {
        const created = await createMutation.mutateAsync({
          assetTypeId: values.assetTypeId,
          name: values.name,
          manufacturer: values.manufacturer || null,
        });
        toast.success("Model created");
        onSaved?.(created);
        // Transition to image upload step
        setCreatedModel(created);
      }
    } catch {
      toast.error(isEditing ? "Failed to update model" : "Failed to create model");
    }
  }

  // The model to show image section for (either editing existing or just-created)
  const imageModel = model ?? createdModel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-8 py-6 border-b">
          <DialogTitle className="text-2xl font-bold">
            {createdModel ? "Add Image" : isEditing ? "Edit Model" : "Add Model"}
          </DialogTitle>
          <DialogDescription>
            {createdModel
              ? "Model created! You can now add a product image."
              : isEditing
                ? "Update the asset model details."
                : "Create a new asset model."}
          </DialogDescription>
        </DialogHeader>

        {createdModel ? (
          // After creation: show image upload and Done button
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-8 py-8">
              <ImageSection model={createdModel} />
            </div>
            <DialogFooter className="px-8 py-6 border-t bg-muted/50 flex justify-end gap-4">
              <Button
                type="button"
                className="font-semibold shadow-lg"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleFormSubmit)}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">
                <FormField
                  control={form.control}
                  name="assetTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Asset Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isEditing || !!defaultAssetTypeId}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assetTypes.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Model Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Latitude 5540" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Manufacturer</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Dell" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isEditing && imageModel && (
                  <>
                    <hr className="border-border" />
                    <ImageSection model={imageModel} />
                  </>
                )}
              </div>

              <DialogFooter className="px-8 py-6 border-t bg-muted/50 flex justify-end gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="font-semibold shadow-lg">
                  {loading
                    ? "Saving..."
                    : isEditing
                      ? "Save Changes"
                      : "Add Model"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
