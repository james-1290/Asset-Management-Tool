import { apiClient } from "../api-client";
import type {
  Asset,
  CreateAssetRequest,
  UpdateAssetRequest,
} from "../../types/asset";
import type { AssetHistory } from "../../types/asset-history";

export const assetsApi = {
  getAll(): Promise<Asset[]> {
    return apiClient.get<Asset[]>("/assets");
  },

  getById(id: string): Promise<Asset> {
    return apiClient.get<Asset>(`/assets/${id}`);
  },

  getHistory(id: string): Promise<AssetHistory[]> {
    return apiClient.get<AssetHistory[]>(`/assets/${id}/history`);
  },

  create(data: CreateAssetRequest): Promise<Asset> {
    return apiClient.post<Asset>("/assets", data);
  },

  update(id: string, data: UpdateAssetRequest): Promise<Asset> {
    return apiClient.put<Asset>(`/assets/${id}`, data);
  },

  archive(id: string): Promise<void> {
    return apiClient.delete(`/assets/${id}`);
  },
};
