export interface DashboardSummary {
  totalAssets: number;
  totalValue: number;
}

export interface StatusBreakdownItem {
  status: string;
  count: number;
}

export interface WarrantyExpiryItem {
  id: string;
  name: string;
  assetTag: string;
  assetTypeName: string;
  warrantyExpiryDate: string;
  daysUntilExpiry: number;
}

export interface AssetsByGroupItem {
  label: string;
  count: number;
}

export interface CheckedOutAsset {
  id: string;
  name: string;
  assetTag: string;
  assignedPersonName: string | null;
  updatedAt: string;
}
