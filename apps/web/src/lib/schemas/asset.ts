import { z } from "zod";

export const assetSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or less"),
  serialNumber: z
    .string()
    .min(1, "Serial number is required")
    .max(200, "Serial number must be 200 characters or less"),
  status: z.string().optional(),
  assetTypeId: z.string().min(1, "Asset type is required"),
  locationId: z.string().min(1, "Location is required"),
  assignedPersonId: z.string().optional().or(z.literal("")),
  purchaseDate: z.string().min(1, "Purchase date is required"),
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
