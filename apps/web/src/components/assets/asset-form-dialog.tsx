import { useEffect, useRef } from "react";
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
}

export function AssetFormDialog({
  open,
  onOpenChange,
  asset,
  assetTypes,
  locations,
  onSubmit,
  loading,
}: AssetFormDialogProps) {
  const isEditing = !!asset;
  const statusManuallySet = useRef(false);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: "",
      assetTag: "",
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
  const { data: customFieldDefs } =
    useCustomFieldDefinitions(watchedAssetTypeId || undefined);

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

  useEffect(() => {
    if (open) {
      statusManuallySet.current = false;

      const cfValues: Record<string, string> = {};
      if (asset?.customFieldValues) {
        for (const v of asset.customFieldValues) {
          cfValues[v.fieldDefinitionId] = v.value ?? "";
        }
      }

      form.reset({
        name: asset?.name ?? "",
        assetTag: asset?.assetTag ?? "",
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
      });
    }
  }, [open, asset, form]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Asset" : "Add Asset"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. MacBook Pro 16" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assetTag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Tag</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. AST-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assetTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Type</FormLabel>
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assignedPersonId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <PersonCombobox
                      value={field.value ?? ""}
                      displayName={asset?.assignedPersonName ?? undefined}
                      onValueChange={handleAssignedPersonChange}
                    />
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
                  <FormLabel>Location</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
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
                    <FormLabel>Purchase Cost</FormLabel>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="warrantyExpiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warranty Expiry</FormLabel>
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes about this asset"
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
