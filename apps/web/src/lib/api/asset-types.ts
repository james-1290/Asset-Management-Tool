import { apiClient } from "../api-client";
import type {
  AssetType,
  CreateAssetTypeRequest,
  UpdateAssetTypeRequest,
} from "../../types/asset-type";

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
};
