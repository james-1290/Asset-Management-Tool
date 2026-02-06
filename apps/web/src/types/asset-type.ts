export interface AssetType {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetTypeRequest {
  name: string;
  description?: string | null;
}

export interface UpdateAssetTypeRequest {
  name: string;
  description?: string | null;
}
