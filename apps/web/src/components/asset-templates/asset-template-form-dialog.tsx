import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { CustomFieldsSection } from "../assets/custom-fields-section";
import { useCustomFieldDefinitions } from "../../hooks/use-asset-types";
import type { AssetTemplate } from "../../types/asset-template";
import type { AssetType } from "../../types/asset-type";
import type { Location } from "../../types/location";

const templateSchema = z.object({
  assetTypeId: z.string().min(1, "Asset type is required"),
  name: z.string().min(1, "Name is required").max(255),
  purchaseCost: z.string().optional().or(z.literal("")),
  depreciationMonths: z.string().optional().or(z.literal("")),
  locationId: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  customFieldValues: z.record(z.string(), z.string().optional()).optional(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface AssetTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: AssetTemplate | null;
  assetTypes: AssetType[];
  locations: Location[];
  onSubmit: (values: TemplateFormValues) => void;
  loading?: boolean;
}

export type { TemplateFormValues };

export function AssetTemplateFormDialog({
  open,
  onOpenChange,
  template,
  assetTypes,
  locations,
  onSubmit,
  loading,
}: AssetTemplateFormDialogProps) {
  const isEditing = !!template;

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      assetTypeId: "",
      name: "",
      purchaseCost: "",
      depreciationMonths: "",
      locationId: "",
      notes: "",
      customFieldValues: {},
    },
  });

  const watchedAssetTypeId = form.watch("assetTypeId");
  const { data: customFieldDefs } =
    useCustomFieldDefinitions(watchedAssetTypeId || undefined);

  useEffect(() => {
    if (open) {
      const cfValues: Record<string, string> = {};
      if (template?.customFieldValues) {
        for (const v of template.customFieldValues) {
          cfValues[v.fieldDefinitionId] = v.value ?? "";
        }
      }

      form.reset({
        assetTypeId: template?.assetTypeId ?? "",
        name: template?.name ?? "",
        purchaseCost:
          template?.purchaseCost != null ? String(template.purchaseCost) : "",
        depreciationMonths:
          template?.depreciationMonths != null
            ? String(template.depreciationMonths)
            : "",
        locationId: template?.locationId ?? "",
        notes: template?.notes ?? "",
        customFieldValues: cfValues,
      });
    }
  }, [open, template, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Template" : "Add Template"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="assetTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Type *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isEditing}
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
                  <FormLabel>Template Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Dell Latitude 5540 Standard"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchaseCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="depreciationMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Depreciation (months)</FormLabel>
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
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Location</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {customFieldDefs && customFieldDefs.length > 0 && (
              <div className="border-t pt-4">
                <CustomFieldsSection definitions={customFieldDefs} />
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional default notes"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
