import type { CustomFieldValueDto, CustomFieldValueInput } from "./custom-field";

export type ApplicationStatus =
  | "Active"
  | "Expired"
  | "Suspended"
  | "PendingRenewal";

export type LicenceType =
  | "PerSeat"
  | "Site"
  | "Volume"
  | "OpenSource"
  | "Trial"
  | "Freeware"
  | "Subscription"
  | "Perpetual";

export interface Application {
  id: string;
  name: string;
  applicationTypeId: string;
  applicationTypeName: string;
  publisher: string | null;
  version: string | null;
  licenceKey: string | null;
  licenceType: LicenceType | null;
  maxSeats: number | null;
  usedSeats: number | null;
  purchaseDate: string | null;
  expiryDate: string | null;
  purchaseCost: number | null;
  autoRenewal: boolean;
  status: ApplicationStatus;
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

export interface CreateApplicationRequest {
  name: string;
  applicationTypeId: string;
  publisher?: string | null;
  version?: string | null;
  licenceKey?: string | null;
  licenceType?: string | null;
  maxSeats?: number | null;
  usedSeats?: number | null;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  purchaseCost?: number | null;
  autoRenewal: boolean;
  status?: string | null;
  notes?: string | null;
  assetId?: string | null;
  personId?: string | null;
  locationId?: string | null;
  customFieldValues?: CustomFieldValueInput[];
}

export interface UpdateApplicationRequest {
  name: string;
  applicationTypeId: string;
  publisher?: string | null;
  version?: string | null;
  licenceKey?: string | null;
  licenceType?: string | null;
  maxSeats?: number | null;
  usedSeats?: number | null;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  purchaseCost?: number | null;
  autoRenewal: boolean;
  status?: string | null;
  notes?: string | null;
  assetId?: string | null;
  personId?: string | null;
  locationId?: string | null;
  customFieldValues?: CustomFieldValueInput[];
}
