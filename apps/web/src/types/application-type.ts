import type { CustomFieldDefinition, CustomFieldDefinitionInput } from "./custom-field";

export interface ApplicationType {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  customFields: CustomFieldDefinition[];
}

export interface CreateApplicationTypeRequest {
  name: string;
  description?: string | null;
  customFields?: CustomFieldDefinitionInput[];
}

export interface UpdateApplicationTypeRequest {
  name: string;
  description?: string | null;
  customFields?: CustomFieldDefinitionInput[];
}
