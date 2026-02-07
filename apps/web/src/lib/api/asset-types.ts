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
      .get<PagedResponse<AssetType>>("/assettypes", { pageSize: 1000 })
      .then((r) => r.items);
  },

  getPaged(params: AssetTypeQueryParams): Promise<PagedResponse<AssetType>> {
    return apiClient.get<PagedResponse<AssetType>>("/assettypes", params as Record<string, string | number | undefined>);
  },

  getById(id: string): Promise<AssetType> {
    return apiClient.get<AssetType>(`/assettypes/${id}`);
  },

  create(data: CreateAssetTypeRequest): Promise<AssetType> {
    return apiClient.post<AssetType>("/assettypes", data);
  },

  update(id: string, data: UpdateAssetTypeRequest): Promise<AssetType> {
    return apiClient.put<AssetType>(`/assettypes/${id}`, data);
  },

  archive(id: string): Promise<void> {
    return apiClient.delete(`/assettypes/${id}`);
  },

  getCustomFields(assetTypeId: string): Promise<CustomFieldDefinition[]> {
    return apiClient.get<CustomFieldDefinition[]>(`/assettypes/${assetTypeId}/customfields`);
  },
};
