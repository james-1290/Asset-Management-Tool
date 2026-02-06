import { z } from "zod";

export const assetTypeSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or less"),
  description: z.string().max(500).optional().or(z.literal("")),
});

export type AssetTypeFormValues = z.infer<typeof assetTypeSchema>;
