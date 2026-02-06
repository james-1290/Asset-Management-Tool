import { z } from "zod";

export const personSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(200, "Full name must be 200 characters or less"),
  email: z
    .string()
    .max(254, "Email must be 254 characters or less")
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  department: z.string().max(200).optional().or(z.literal("")),
  jobTitle: z.string().max(200).optional().or(z.literal("")),
  locationId: z.string().optional().or(z.literal("")),
});

export type PersonFormValues = z.infer<typeof personSchema>;
