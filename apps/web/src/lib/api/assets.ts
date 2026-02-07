import { apiClient } from "../api-client";
import type {
  Asset,
  CreateAssetRequest,
  UpdateAssetRequest,
  CheckoutAssetRequest,
  CheckinAssetRequest,
} from "../../types/asset";
import type { AssetHistory } from "../../types/asset-history";

export const assetsApi = {
  getAll(): Promise<Asset[]> {
    return apiClient.get<Asset[]>("/assets");
  },

  getById(id: string): Promise<Asset> {
    return apiClient.get<Asset>(`/assets/${id}`);
  },

  getHistory(id: string, limit?: number): Promise<AssetHistory[]> {
    const params = limit ? `?limit=${limit}` : "";
    return apiClient.get<AssetHistory[]>(`/assets/${id}/history${params}`);
  },

  create(data: CreateAssetRequest): Promise<Asset> {
    return apiClient.post<Asset>("/assets", data);
  },

  update(id: string, data: UpdateAssetRequest): Promise<Asset> {
    return apiClient.put<Asset>(`/assets/${id}`, data);
  },

  checkout(id: string, data: CheckoutAssetRequest): Promise<Asset> {
    return apiClient.post<Asset>(`/assets/${id}/checkout`, data);
  },

  checkin(id: string, data: CheckinAssetRequest): Promise<Asset> {
    return apiClient.post<Asset>(`/assets/${id}/checkin`, data);
  },

  archive(id: string): Promise<void> {
    return apiClient.delete(`/assets/${id}`);
  },
};
