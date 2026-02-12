import type { CustomFieldDefinition, CustomFieldDefinitionInput } from "./custom-field";

export interface AssetType {
  id: string;
  name: string;
  description: string | null;
  defaultDepreciationMonths: number | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  customFields: CustomFieldDefinition[];
}

export interface CreateAssetTypeRequest {
  name: string;
  description?: string | null;
  defaultDepreciationMonths?: number | null;
  customFields?: CustomFieldDefinitionInput[];
}

export interface UpdateAssetTypeRequest {
  name: string;
  description?: string | null;
  defaultDepreciationMonths?: number | null;
  customFields?: CustomFieldDefinitionInput[];
}
