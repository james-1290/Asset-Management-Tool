import { z } from "zod";
import { customFieldDefinitionSchema } from "./asset-type";

export const applicationTypeSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or less"),
  description: z.string().max(500).optional().or(z.literal("")),
  customFields: z.array(customFieldDefinitionSchema),
});

export type ApplicationTypeFormValues = z.infer<typeof applicationTypeSchema>;
