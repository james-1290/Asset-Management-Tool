import { apiClient } from "../api-client";
import type {
  Asset,
  CreateAssetRequest,
  UpdateAssetRequest,
  CheckoutAssetRequest,
  CheckinAssetRequest,
  RetireAssetRequest,
  SellAssetRequest,
} from "../../types/asset";
import type { AssetHistory } from "../../types/asset-history";
import type { PagedResponse } from "../../types/paged-response";
import type { DuplicateCheckResult, CheckAssetDuplicatesRequest } from "../../types/duplicate-check";

export interface AssetQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  includeStatuses?: string;
  sortBy?: string;
  sortDir?: string;
  typeId?: string;
}

export const assetsApi = {
  getAll(): Promise<Asset[]> {
    return apiClient
      .get<PagedResponse<Asset>>("/assets", { pageSize: 1000 })
      .then((r) => r.items);
  },

  getPaged(params: AssetQueryParams): Promise<PagedResponse<Asset>> {
    return apiClient.get<PagedResponse<Asset>>("/assets", params as Record<string, string | number | undefined>);
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

  retire(id: string, data: RetireAssetRequest): Promise<Asset> {
    return apiClient.post<Asset>(`/assets/${id}/retire`, data);
  },

  sell(id: string, data: SellAssetRequest): Promise<Asset> {
    return apiClient.post<Asset>(`/assets/${id}/sell`, data);
  },

  archive(id: string): Promise<void> {
    return apiClient.delete(`/assets/${id}`);
  },

  bulkArchive(ids: string[]): Promise<{ succeeded: number; failed: number }> {
    return apiClient.post("/assets/bulk-archive", { ids });
  },

  bulkStatus(ids: string[], status: string): Promise<{ succeeded: number; failed: number }> {
    return apiClient.post("/assets/bulk-status", { ids, status });
  },

  exportCsv(params: Omit<AssetQueryParams, "page" | "pageSize"> & { ids?: string }): Promise<void> {
    return apiClient.downloadCsv("/assets/export", params as Record<string, string | number | undefined>, "assets-export.csv");
  },

  checkDuplicates(data: CheckAssetDuplicatesRequest): Promise<DuplicateCheckResult[]> {
    return apiClient.post<DuplicateCheckResult[]>("/assets/check-duplicates", data);
  },
};
