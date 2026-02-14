import type {
  StatusBreakdownItem,
  AssetsByGroupItem,
  AssetsByAgeBucket,
  WarrantyExpiryItem,
  LicenceExpiryItem,
} from "./dashboard";

export interface AssetSummaryReport {
  totalAssets: number;
  totalValue: number;
  byStatus: StatusBreakdownItem[];
  byType: AssetsByGroupItem[];
  byLocation: AssetsByGroupItem[];
}

export interface ExpiryItem {
  id: string;
  name: string;
  category: string;
  typeName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  status: string;
}

export interface ExpiriesReport {
  items: ExpiryItem[];
  totalCount: number;
}

export interface LicenceSummaryReport {
  totalApplications: number;
  active: number;
  expired: number;
  pendingRenewal: number;
  suspended: number;
  totalSpend: number;
  expiringSoon: LicenceExpiryItem[];
}

export interface PersonAssignment {
  personId: string;
  fullName: string;
  email: string | null;
  assignedAssetCount: number;
  assets: AssignedAssetBrief[];
}

export interface AssignedAssetBrief {
  id: string;
  name: string;
}

export interface AssignmentsReport {
  totalAssigned: number;
  totalPeople: number;
  people: PersonAssignment[];
}

export interface OldestAsset {
  id: string;
  name: string;
  assetTypeName: string;
  purchaseDate: string;
  ageDays: number;
}

export interface AssetLifecycleReport {
  byAge: AssetsByAgeBucket[];
  pastWarranty: WarrantyExpiryItem[];
  oldestAssets: OldestAsset[];
}

export interface DepreciationAsset {
  id: string;
  name: string;
  assetTypeName: string;
  purchaseDate: string | null;
  originalCost: number;
  depreciationMethod: string;
  usefulLifeYears: number | null;
  accumulatedDepreciation: number;
  currentBookValue: number;
  remainingUsefulLifeMonths: number | null;
}

export interface DepreciationGroup {
  assetTypeName: string;
  subtotalOriginalCost: number;
  subtotalAccumulatedDepreciation: number;
  subtotalBookValue: number;
  assets: DepreciationAsset[];
}

export interface DepreciationReport {
  totalOriginalCost: number;
  totalAccumulatedDepreciation: number;
  totalBookValue: number;
  groups: DepreciationGroup[];
}
