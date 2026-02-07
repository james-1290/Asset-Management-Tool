import { z } from "zod";

export const applicationSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or less"),
  applicationTypeId: z.string().min(1, "Application type is required"),
  publisher: z.string().max(500).optional().or(z.literal("")),
  version: z.string().max(200).optional().or(z.literal("")),
  licenceKey: z.string().max(500).optional().or(z.literal("")),
  licenceType: z.string().optional().or(z.literal("")),
  maxSeats: z.string().optional().or(z.literal("")),
  usedSeats: z.string().optional().or(z.literal("")),
  purchaseDate: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  purchaseCost: z.string().optional().or(z.literal("")),
  autoRenewal: z.boolean(),
  status: z.string().optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
  assetId: z.string().optional().or(z.literal("")),
  personId: z.string().optional().or(z.literal("")),
  locationId: z.string().optional().or(z.literal("")),
  customFieldValues: z.record(z.string(), z.string().optional()).optional(),
});

export type ApplicationFormValues = z.infer<typeof applicationSchema>;
