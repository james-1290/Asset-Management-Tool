import { apiClient } from "../api-client";
import type {
  AssetType,
  CreateAssetTypeRequest,
  UpdateAssetTypeRequest,
} from "../../types/asset-type";
import type { CustomFieldDefinition } from "../../types/custom-field";
import type { PagedResponse } from "../../types/paged-response";

export interface AssetTypeQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: string;
}

export const assetTypesApi = {
  getAll(): Promise<AssetType[]> {
    return apiClient
      .get<PagedResponse<AssetType>>("/asset-types", { pageSize: 1000 })
      .then((r) => r.items);
  },

  getPaged(params: AssetTypeQueryParams): Promise<PagedResponse<AssetType>> {
    return apiClient.get<PagedResponse<AssetType>>("/asset-types", params as Record<string, string | number | undefined>);
  },

  getById(id: string): Promise<AssetType> {
    return apiClient.get<AssetType>(`/asset-types/${id}`);
  },

  create(data: CreateAssetTypeRequest): Promise<AssetType> {
    return apiClient.post<AssetType>("/asset-types", data);
  },

  update(id: string, data: UpdateAssetTypeRequest): Promise<AssetType> {
    return apiClient.put<AssetType>(`/asset-types/${id}`, data);
  },

  archive(id: string): Promise<void> {
    return apiClient.delete(`/asset-types/${id}`);
  },

  bulkArchive(ids: string[]): Promise<{ succeeded: number; failed: number }> {
    return apiClient.post("/asset-types/bulk-archive", { ids });
  },

  getCustomFields(assetTypeId: string): Promise<CustomFieldDefinition[]> {
    return apiClient.get<CustomFieldDefinition[]>(`/asset-types/${assetTypeId}/customfields`);
  },
};
