import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
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
import { Button } from "../ui/button";
import { CustomFieldEditor } from "./custom-field-editor";
import {
  assetTypeSchema,
  type AssetTypeFormValues,
} from "../../lib/schemas/asset-type";
import type { AssetType } from "../../types/asset-type";

interface AssetTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetType?: AssetType | null;
  onSubmit: (values: AssetTypeFormValues) => void;
  loading?: boolean;
}

export function AssetTypeFormDialog({
  open,
  onOpenChange,
  assetType,
  onSubmit,
  loading,
}: AssetTypeFormDialogProps) {
  const isEditing = !!assetType;

  const form = useForm<AssetTypeFormValues>({
    resolver: zodResolver(assetTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultDepreciationMonths: "",
      nameTemplate: "",
      customFields: [],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: assetType?.name ?? "",
        description: assetType?.description ?? "",
        defaultDepreciationMonths: assetType?.defaultDepreciationMonths != null
          ? String(assetType.defaultDepreciationMonths)
          : "",
        nameTemplate: assetType?.nameTemplate ?? "",
        customFields:
          assetType?.customFields?.map((cf, i) => ({
            id: cf.id,
            name: cf.name,
            fieldType: cf.fieldType,
            options: cf.options ?? "",
            isRequired: cf.isRequired,
            sortOrder: cf.sortOrder ?? i,
          })) ?? [],
      });
    }
  }, [open, assetType, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Asset Type" : "Add Asset Type"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Laptop" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultDepreciationMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Depreciation (months)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 36"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nameTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name Template</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. COAD-%SERIALNUMBER%"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Auto-generates asset names. Variables: %SERIALNUMBER%, %ASSETTYPENAME%
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4">
              <CustomFieldEditor />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : isEditing ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
