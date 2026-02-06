import { z } from "zod";

export const assetSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or less"),
  assetTag: z
    .string()
    .min(1, "Asset tag is required")
    .max(100, "Asset tag must be 100 characters or less"),
  serialNumber: z.string().max(200).optional().or(z.literal("")),
  status: z.string().optional(),
  assetTypeId: z.string().min(1, "Asset type is required"),
  locationId: z.string().optional().or(z.literal("")),
  assignedUserId: z.string().optional().or(z.literal("")),
  purchaseDate: z.string().optional().or(z.literal("")),
  purchaseCost: z
    .string()
    .optional()
    .or(z.literal("")),
  warrantyExpiryDate: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type AssetFormValues = z.infer<typeof assetSchema>;
