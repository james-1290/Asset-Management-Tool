import { z } from "zod";

export const assetSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or less"),
  // Optional, matching the API and the CSV importer, which both accept an asset
  // with only a name and a type. Requiring these three here made every imported
  // record uneditable: the form demanded data the import had never asked for.
  serialNumber: z
    .string()
    .max(200, "Serial number must be 200 characters or less")
    .optional()
    .or(z.literal("")),
  status: z.string().optional(),
  assetTypeId: z.string().min(1, "Asset type is required"),
  assetModelId: z.string().optional().or(z.literal("")),
  locationId: z.string().optional().or(z.literal("")),
  assignedPersonId: z.string().optional().or(z.literal("")),
  purchaseDate: z.string().optional().or(z.literal("")),
  purchaseCost: z
    .string()
    .optional()
    .or(z.literal("")),
  warrantyExpiryDate: z.string().optional().or(z.literal("")),
  depreciationMonths: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  customFieldValues: z.record(z.string(), z.string().optional()).optional(),
});

export type AssetFormValues = z.infer<typeof assetSchema>;
