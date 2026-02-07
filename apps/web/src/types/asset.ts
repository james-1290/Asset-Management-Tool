export type AssetStatus =
  | "Available"
  | "Assigned"
  | "CheckedOut"
  | "InMaintenance"
  | "Retired"
  | "Sold"
  | "Archived";

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
  notes: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
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
  notes?: string | null;
}

export interface CheckoutAssetRequest {
  personId: string;
  notes?: string | null;
}

export interface CheckinAssetRequest {
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
  notes?: string | null;
}
