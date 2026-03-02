export interface AssetModel {
  id: string;
  assetTypeId: string;
  assetTypeName: string;
  name: string;
  manufacturer: string | null;
  imageUrl: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetModelRequest {
  assetTypeId: string;
  name: string;
  manufacturer?: string | null;
}

export interface UpdateAssetModelRequest {
  name: string;
  manufacturer?: string | null;
}
