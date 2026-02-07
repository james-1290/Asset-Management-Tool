import type { CustomFieldValueDto, CustomFieldValueInput } from "./custom-field";

export type CertificateStatus =
  | "Active"
  | "Expired"
  | "Revoked"
  | "PendingRenewal";

export interface Certificate {
  id: string;
  name: string;
  certificateTypeId: string;
  certificateTypeName: string;
  issuer: string | null;
  subject: string | null;
  thumbprint: string | null;
  serialNumber: string | null;
  issuedDate: string | null;
  expiryDate: string | null;
  status: CertificateStatus;
  autoRenewal: boolean;
  notes: string | null;
  assetId: string | null;
  assetName: string | null;
  personId: string | null;
  personName: string | null;
  locationId: string | null;
  locationName: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  customFieldValues: CustomFieldValueDto[];
}

export interface CreateCertificateRequest {
  name: string;
  certificateTypeId: string;
  issuer?: string | null;
  subject?: string | null;
  thumbprint?: string | null;
  serialNumber?: string | null;
  issuedDate?: string | null;
  expiryDate?: string | null;
  status?: string | null;
  autoRenewal: boolean;
  notes?: string | null;
  assetId?: string | null;
  personId?: string | null;
  locationId?: string | null;
  customFieldValues?: CustomFieldValueInput[];
}

export interface UpdateCertificateRequest {
  name: string;
  certificateTypeId: string;
  issuer?: string | null;
  subject?: string | null;
  thumbprint?: string | null;
  serialNumber?: string | null;
  issuedDate?: string | null;
  expiryDate?: string | null;
  status?: string | null;
  autoRenewal: boolean;
  notes?: string | null;
  assetId?: string | null;
  personId?: string | null;
  locationId?: string | null;
  customFieldValues?: CustomFieldValueInput[];
}
