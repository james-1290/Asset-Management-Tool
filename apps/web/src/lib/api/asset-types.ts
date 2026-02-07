import { apiClient } from "../api-client";
import type {
  AssetType,
  CreateAssetTypeRequest,
  UpdateAssetTypeRequest,
} from "../../types/asset-type";
import type { CustomFieldDefinition } from "../../types/custom-field";

export const assetTypesApi = {
  getAll(): Promise<AssetType[]> {
    return apiClient.get<AssetType[]>("/assettypes");
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
