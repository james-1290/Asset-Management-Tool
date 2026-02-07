import type { CustomFieldDefinition, CustomFieldDefinitionInput } from "./custom-field";

export interface AssetType {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  customFields: CustomFieldDefinition[];
}

export interface CreateAssetTypeRequest {
  name: string;
  description?: string | null;
  customFields?: CustomFieldDefinitionInput[];
}

export interface UpdateAssetTypeRequest {
  name: string;
  description?: string | null;
  customFields?: CustomFieldDefinitionInput[];
}
