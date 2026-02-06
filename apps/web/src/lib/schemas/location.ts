import { z } from "zod";

export const locationSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or less"),
  address: z.string().max(500).optional().or(z.literal("")),
  city: z.string().max(200).optional().or(z.literal("")),
  country: z.string().max(200).optional().or(z.literal("")),
});

export type LocationFormValues = z.infer<typeof locationSchema>;
