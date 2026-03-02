import { apiClient } from "../api-client";
import type {
  AssetModel,
  CreateAssetModelRequest,
  UpdateAssetModelRequest,
} from "../../types/asset-model";
import type { PagedResponse } from "../../types/paged-response";

export interface AssetModelQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  assetTypeId?: string;
  sortBy?: string;
  sortDir?: string;
}

export const assetModelsApi = {
  getAll(assetTypeId?: string): Promise<AssetModel[]> {
    const params: Record<string, string | number> = { pageSize: 1000 };
    if (assetTypeId) params.assetTypeId = assetTypeId;
    return apiClient
      .get<PagedResponse<AssetModel>>("/asset-models", params)
      .then((r) => r.items);
  },

  getPaged(params: AssetModelQueryParams): Promise<PagedResponse<AssetModel>> {
    return apiClient.get<PagedResponse<AssetModel>>("/asset-models", params as Record<string, string | number | undefined>);
  },

  getById(id: string): Promise<AssetModel> {
    return apiClient.get<AssetModel>(`/asset-models/${id}`);
  },

  create(data: CreateAssetModelRequest): Promise<AssetModel> {
    return apiClient.post<AssetModel>("/asset-models", data);
  },

  update(id: string, data: UpdateAssetModelRequest): Promise<AssetModel> {
    return apiClient.put<AssetModel>(`/asset-models/${id}`, data);
  },

  archive(id: string): Promise<void> {
    return apiClient.delete(`/asset-models/${id}`);
  },

  uploadImage(id: string, file: File): Promise<AssetModel> {
    return apiClient.uploadFile<AssetModel>(`/asset-models/${id}/image`, file);
  },

  deleteImage(id: string): Promise<void> {
    return apiClient.delete(`/asset-models/${id}/image`);
  },
};
