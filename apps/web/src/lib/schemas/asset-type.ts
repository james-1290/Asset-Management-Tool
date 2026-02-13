import { z } from "zod";

const FIELD_TYPES = [
  "Text",
  "Number",
  "Date",
  "Boolean",
  "SingleSelect",
  "MultiSelect",
  "Url",
] as const;

export const customFieldDefinitionSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().min(1, "Field name is required").max(200),
  fieldType: z.enum(FIELD_TYPES),
  options: z.string().optional().or(z.literal("")),
  isRequired: z.boolean(),
  sortOrder: z.number(),
});

export const assetTypeSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or less"),
  description: z.string().max(500).optional().or(z.literal("")),
  defaultDepreciationMonths: z.string().optional().or(z.literal("")),
  nameTemplate: z.string().max(500).optional().or(z.literal("")),
  customFields: z.array(customFieldDefinitionSchema),
});

export type CustomFieldDefinitionFormValues = z.infer<
  typeof customFieldDefinitionSchema
>;
export type AssetTypeFormValues = z.infer<typeof assetTypeSchema>;
