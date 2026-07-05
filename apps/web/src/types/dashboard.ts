export interface DashboardSummary {
  totalAssets: number;
  totalValue: number;
  totalBookValue: number;
}

export interface StatusBreakdownItem {
  status: string;
  count: number;
}

export interface WarrantyExpiryItem {
  id: string;
  name: string;
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
  assignedPersonName: string | null;
  updatedAt: string;
}

export interface AssetsByAgeBucket {
  bucket: string;
  count: number;
}

export interface ValueByLocation {
  locationName: string;
  totalValue: number;
}

export interface CertificateExpiryItem {
  id: string;
  name: string;
  certificateTypeName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  status: string;
}

export interface LicenceExpiryItem {
  id: string;
  name: string;
  applicationTypeName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  status: string;
}

export interface InventorySnapshotItem {
  label: string;
  count: number;
  filterUrl: string;
}
