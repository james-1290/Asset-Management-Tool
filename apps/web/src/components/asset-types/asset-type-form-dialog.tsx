import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
      <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-8 py-6 border-b">
          <DialogTitle className="text-2xl font-bold">
            {isEditing ? "Edit Asset Type" : "Add Asset Type"}
          </DialogTitle>
          <DialogDescription>
            Define a new asset category with custom fields.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Laptop" {...field} />
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
                      <FormLabel className="font-semibold">Default Depreciation (months)</FormLabel>
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
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Description</FormLabel>
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
                name="nameTemplate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Name Template</FormLabel>
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

              <hr className="border-border" />

              <CustomFieldEditor />
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
                {loading ? "Saving..." : isEditing ? "Save Changes" : "Add Asset Type"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
