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
  async getAll(assetTypeId?: string): Promise<AssetModel[]> {
    // Backend caps pageSize at 100 — page through for the full dropdown list.
    const items: AssetModel[] = [];
    let page = 1;
    while (page <= 100) {
      const params: Record<string, string | number> = { page, pageSize: 100 };
      if (assetTypeId) params.assetTypeId = assetTypeId;
      const r = await apiClient.get<PagedResponse<AssetModel>>("/asset-models", params);
      items.push(...r.items);
      if (r.items.length === 0 || items.length >= r.totalCount) break;
      page++;
    }
    return items;
  },

  getPaged(params: AssetModelQueryParams): Promise<PagedResponse<AssetModel>> {
    return apiClient.get<PagedResponse<AssetModel>>("/asset-models", params as Record<string, string | number | undefined>);
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
