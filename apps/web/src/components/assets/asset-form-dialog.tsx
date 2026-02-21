import { useEffect, useRef, useState } from "react";
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
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { PersonCombobox } from "../person-combobox";
import { CustomFieldsSection } from "./custom-fields-section";
import { assetSchema, type AssetFormValues } from "../../lib/schemas/asset";
import { useCustomFieldDefinitions } from "../../hooks/use-asset-types";
import { useAssetTemplates } from "../../hooks/use-asset-templates";
import type { Asset } from "../../types/asset";
import type { AssetType } from "../../types/asset-type";
import type { Location } from "../../types/location";

const ASSET_STATUSES = [
  { value: "Available", label: "Available" },
  { value: "Assigned", label: "Assigned" },
  { value: "CheckedOut", label: "Checked Out" },
  { value: "InMaintenance", label: "In Maintenance" },
  { value: "Retired", label: "Retired" },
  { value: "Sold", label: "Sold" },
] as const;

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: Asset | null;
  assetTypes: AssetType[];
  locations: Location[];
  onSubmit: (values: AssetFormValues) => void;
  loading?: boolean;
  initialValues?: Partial<AssetFormValues>;
}

export function AssetFormDialog({
  open,
  onOpenChange,
  asset,
  assetTypes,
  locations,
  onSubmit,
  loading,
  initialValues,
}: AssetFormDialogProps) {
  const isEditing = !!asset;
  const statusManuallySet = useRef(false);
  const nameManuallyEdited = useRef(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: "",
      serialNumber: "",
      status: "Available",
      assetTypeId: "",
      locationId: "",
      assignedPersonId: "",
      purchaseDate: "",
      purchaseCost: "",
      depreciationMonths: "",
      warrantyExpiryDate: "",
      notes: "",
      customFieldValues: {},
    },
  });

  const watchedAssetTypeId = form.watch("assetTypeId");
  const watchedSerialNumber = form.watch("serialNumber");
  const { data: customFieldDefs } =
    useCustomFieldDefinitions(watchedAssetTypeId || undefined);
  const { data: templates } = useAssetTemplates(
    !isEditing && watchedAssetTypeId ? watchedAssetTypeId : undefined,
  );

  // Auto-fill depreciation months from asset type default (only when creating)
  useEffect(() => {
    if (!isEditing && watchedAssetTypeId) {
      const selectedType = assetTypes.find((t) => t.id === watchedAssetTypeId);
      if (selectedType?.defaultDepreciationMonths) {
        const current = form.getValues("depreciationMonths");
        if (!current) {
          form.setValue("depreciationMonths", String(selectedType.defaultDepreciationMonths));
        }
      }
    }
  }, [watchedAssetTypeId, isEditing, assetTypes, form]);

  // Auto-fill name from asset type nameTemplate (only when creating)
  useEffect(() => {
    if (isEditing || nameManuallyEdited.current) return;
    if (!watchedAssetTypeId || !watchedSerialNumber) return;

    const selectedType = assetTypes.find((t) => t.id === watchedAssetTypeId);
    if (!selectedType?.nameTemplate) return;

    let generatedName = selectedType.nameTemplate;
    generatedName = generatedName.replace(/%SERIALNUMBER%/g, watchedSerialNumber);
    generatedName = generatedName.replace(/%ASSETTYPENAME%/g, selectedType.name);

    form.setValue("name", generatedName);
  }, [watchedAssetTypeId, watchedSerialNumber, isEditing, assetTypes, form]);

  // Reset template picker when asset type changes
  useEffect(() => {
    if (!isEditing) {
      setSelectedTemplateId("");
    }
  }, [watchedAssetTypeId, isEditing]);

  useEffect(() => {
    if (open) {
      statusManuallySet.current = false;
      nameManuallyEdited.current = isEditing;
      setSelectedTemplateId("");

      const cfValues: Record<string, string> = {};
      if (asset?.customFieldValues) {
        for (const v of asset.customFieldValues) {
          cfValues[v.fieldDefinitionId] = v.value ?? "";
        }
      }

      const defaultValues: AssetFormValues = {
        name: asset?.name ?? "",
        serialNumber: asset?.serialNumber ?? "",
        status: asset?.status ?? "Available",
        assetTypeId: asset?.assetTypeId ?? "",
        locationId: asset?.locationId ?? "",
        assignedPersonId: asset?.assignedPersonId ?? "",
        purchaseDate: asset?.purchaseDate
          ? asset.purchaseDate.substring(0, 10)
          : "",
        purchaseCost:
          asset?.purchaseCost != null ? String(asset.purchaseCost) : "",
        depreciationMonths:
          asset?.depreciationMonths != null ? String(asset.depreciationMonths) : "",
        warrantyExpiryDate: asset?.warrantyExpiryDate
          ? asset.warrantyExpiryDate.substring(0, 10)
          : "",
        notes: asset?.notes ?? "",
        customFieldValues: cfValues,
      };

      // Apply initialValues for cloning (create mode only)
      if (!isEditing && initialValues) {
        form.reset({ ...defaultValues, ...initialValues });
        nameManuallyEdited.current = false;
      } else {
        form.reset(defaultValues);
      }
    }
  }, [open, asset, form, isEditing, initialValues]);

  function handleAssignedPersonChange(personId: string) {
    form.setValue("assignedPersonId", personId);
    if (isEditing) return;

    const currentStatus = form.getValues("status");
    const isNone = !personId || personId === "none";

    if (!isNone && currentStatus === "Available" && !statusManuallySet.current) {
      form.setValue("status", "Assigned");
    } else if (isNone && currentStatus === "Assigned" && !statusManuallySet.current) {
      form.setValue("status", "Available");
    }
  }

  function handleStatusChange(status: string) {
    statusManuallySet.current = true;
    form.setValue("status", status);
  }

  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId);
    if (templateId === "__none__" || !templateId) return;

    const template = templates?.find((t) => t.id === templateId);
    if (!template) return;

    // Apply template defaults — only fill empty fields
    if (template.purchaseCost != null && !form.getValues("purchaseCost")) {
      form.setValue("purchaseCost", String(template.purchaseCost));
    }
    if (template.depreciationMonths != null && !form.getValues("depreciationMonths")) {
      form.setValue("depreciationMonths", String(template.depreciationMonths));
    }
    if (template.locationId && !form.getValues("locationId")) {
      form.setValue("locationId", template.locationId);
    }
    if (template.notes && !form.getValues("notes")) {
      form.setValue("notes", template.notes);
    }

    // Merge custom field values
    if (template.customFieldValues?.length) {
      const currentCfv = form.getValues("customFieldValues") ?? {};
      const merged = { ...currentCfv };
      for (const cfv of template.customFieldValues) {
        if (!merged[cfv.fieldDefinitionId]) {
          merged[cfv.fieldDefinitionId] = cfv.value ?? "";
        }
      }
      form.setValue("customFieldValues", merged);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-8 py-6 border-b">
          <DialogTitle className="text-2xl font-bold">
            {isEditing ? "Edit Asset" : "Add Asset"}
          </DialogTitle>
          <DialogDescription>
            Fill in the details to register a new asset.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">

              {/* Section 1 - General Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">General Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="assetTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Asset Type *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
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
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Serial Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. ABC123XYZ" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. MacBook Pro 16"
                            {...field}
                            onChange={(e) => {
                              nameManuallyEdited.current = true;
                              field.onChange(e);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Status</FormLabel>
                        <Select
                          onValueChange={handleStatusChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ASSET_STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
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
                    name="assignedPersonId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Assigned To</FormLabel>
                        <PersonCombobox
                          value={field.value ?? ""}
                          displayName={asset?.assignedPersonName ?? undefined}
                          onValueChange={handleAssignedPersonChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Location *</FormLabel>
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

                {!isEditing && watchedAssetTypeId && templates && templates.length > 0 && (
                  <div>
                    <label className="text-sm font-semibold">Template</label>
                    <Select
                      value={selectedTemplateId}
                      onValueChange={handleTemplateChange}
                    >
                      <SelectTrigger className="w-full mt-1.5">
                        <SelectValue placeholder="Apply a template (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <hr className="border-border" />

              {/* Section 2 - Financial */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Financial</h3>
                <div className="grid grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Purchase Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="purchaseCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Purchase Cost</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
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
                    name="warrantyExpiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Warranty Expiry</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
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
                </div>
              </div>

              {/* Section 3 - Custom Fields */}
              {customFieldDefs && customFieldDefs.length > 0 && (
                <>
                  <hr className="border-border" />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Custom Fields</h3>
                    <CustomFieldsSection definitions={customFieldDefs} />
                  </div>
                </>
              )}

              <hr className="border-border" />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional context..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                {loading ? "Saving..." : isEditing ? "Save Changes" : "Add Asset"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
