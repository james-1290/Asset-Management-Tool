import type { CustomFieldDefinition, CustomFieldDefinitionInput } from "./custom-field";

export interface CertificateType {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  customFields: CustomFieldDefinition[];
}

export interface CreateCertificateTypeRequest {
  name: string;
  description?: string | null;
  customFields?: CustomFieldDefinitionInput[];
}

export interface UpdateCertificateTypeRequest {
  name: string;
  description?: string | null;
  customFields?: CustomFieldDefinitionInput[];
}
