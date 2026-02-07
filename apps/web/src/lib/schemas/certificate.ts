import { z } from "zod";

export const certificateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or less"),
  certificateTypeId: z.string().min(1, "Certificate type is required"),
  issuer: z.string().max(500).optional().or(z.literal("")),
  subject: z.string().max(500).optional().or(z.literal("")),
  thumbprint: z.string().max(200).optional().or(z.literal("")),
  serialNumber: z.string().max(200).optional().or(z.literal("")),
  issuedDate: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  status: z.string().optional(),
  autoRenewal: z.boolean(),
  notes: z.string().max(2000).optional().or(z.literal("")),
  assetId: z.string().optional().or(z.literal("")),
  personId: z.string().optional().or(z.literal("")),
  locationId: z.string().optional().or(z.literal("")),
  customFieldValues: z.record(z.string(), z.string().optional()).optional(),
});

export type CertificateFormValues = z.infer<typeof certificateSchema>;
