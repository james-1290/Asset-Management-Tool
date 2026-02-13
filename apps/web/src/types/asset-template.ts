import type { CustomFieldValueDto, CustomFieldValueInput } from "./custom-field";

export interface AssetTemplate {
  id: string;
  assetTypeId: string;
  assetTypeName: string;
  name: string;
  purchaseCost: number | null;
  depreciationMonths: number | null;
  locationId: string | null;
  locationName: string | null;
  notes: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  customFieldValues: CustomFieldValueDto[];
}

export interface CreateAssetTemplateRequest {
  assetTypeId: string;
  name: string;
  purchaseCost?: number | null;
  depreciationMonths?: number | null;
  locationId?: string | null;
  notes?: string | null;
  customFieldValues?: CustomFieldValueInput[];
}

export interface UpdateAssetTemplateRequest {
  name: string;
  purchaseCost?: number | null;
  depreciationMonths?: number | null;
  locationId?: string | null;
  notes?: string | null;
  customFieldValues?: CustomFieldValueInput[];
}
