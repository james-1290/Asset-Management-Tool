import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
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
import { FormDialog } from "../form-dialog";
import { CustomFieldsSection } from "../assets/custom-fields-section";
import { useCustomFieldDefinitions } from "../../hooks/use-asset-types";
import type { AssetTemplate } from "../../types/asset-template";
import type { AssetType } from "../../types/asset-type";
import type { Location } from "../../types/location";
import { getCurrencySymbol } from "../../lib/format";

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
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit Template" : "Add Template"}
      description="Create a reusable template for quick asset creation."
      form={form}
      onSubmit={onSubmit}
      loading={loading}
      isEditing={isEditing}
      submitLabel={isEditing ? "Save Changes" : "Add Template"}
      size="4xl"
    >
      {/* Section 1 - General */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="assetTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Asset Type *</FormLabel>
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
                      <FormLabel className="font-semibold">Template Name *</FormLabel>
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
              </div>

              <hr className="border-border" />

              {/* Section 2 - Defaults */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="purchaseCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Default Cost</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            {getCurrencySymbol()}
                          </span>
                          <Input
                            className="pl-7"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                          />
                        </div>
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
                      <FormLabel className="font-semibold">Depreciation (months)</FormLabel>
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
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Default Location</FormLabel>
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
              </div>

              {/* Custom Fields */}
              {customFieldDefs && customFieldDefs.length > 0 && (
                <>
                  <hr className="border-border" />
                  <CustomFieldsSection definitions={customFieldDefs} />
                </>
              )}

              <hr className="border-border" />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Default Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any default notes for assets created from this template..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
    </FormDialog>
  );
}
