export type AssetStatus =
  | "Available"
  | "Assigned"
  | "CheckedOut"
  | "InMaintenance"
  | "Retired"
  | "Sold"
  | "Archived";

import type { CustomFieldValueDto, CustomFieldValueInput } from "./custom-field";

export interface Asset {
  id: string;
  name: string;
  assetTag: string;
  serialNumber: string | null;
  status: AssetStatus;
  assetTypeId: string;
  assetTypeName: string;
  locationId: string | null;
  locationName: string | null;
  assignedPersonId: string | null;
  assignedPersonName: string | null;
  purchaseDate: string | null;
  purchaseCost: number | null;
  warrantyExpiryDate: string | null;
  depreciationMonths: number | null;
  bookValue: number | null;
  totalDepreciation: number | null;
  monthlyDepreciation: number | null;
  soldDate: string | null;
  soldPrice: number | null;
  retiredDate: string | null;
  notes: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  customFieldValues: CustomFieldValueDto[];
}

export interface CreateAssetRequest {
  name: string;
  assetTag: string;
  serialNumber?: string | null;
  status?: string | null;
  assetTypeId: string;
  locationId?: string | null;
  assignedPersonId?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  warrantyExpiryDate?: string | null;
  depreciationMonths?: number | null;
  notes?: string | null;
  customFieldValues?: CustomFieldValueInput[];
}

export interface CheckoutAssetRequest {
  personId: string;
  notes?: string | null;
}

export interface CheckinAssetRequest {
  notes?: string | null;
}

export interface RetireAssetRequest {
  notes?: string | null;
}

export interface SellAssetRequest {
  soldPrice?: number | null;
  soldDate?: string | null;
  notes?: string | null;
}

export interface UpdateAssetRequest {
  name: string;
  assetTag: string;
  serialNumber?: string | null;
  status?: string | null;
  assetTypeId: string;
  locationId?: string | null;
  assignedPersonId?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  warrantyExpiryDate?: string | null;
  depreciationMonths?: number | null;
  notes?: string | null;
  customFieldValues?: CustomFieldValueInput[];
}
