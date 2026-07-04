import { apiClient } from "../api-client";
import { createEntityApi } from "./create-entity-api";
import type {
  Asset,
  CreateAssetRequest,
  UpdateAssetRequest,
  CheckoutAssetRequest,
  CheckinAssetRequest,
  RetireAssetRequest,
  SellAssetRequest,
  BulkEditAssetsRequest,
} from "../../types/asset";
import type { AssetHistory } from "../../types/asset-history";
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
  // Advanced filters
  locationId?: string;
  assignedPersonId?: string;
  purchaseDateFrom?: string;
  purchaseDateTo?: string;
  warrantyExpiryFrom?: string;
  warrantyExpiryTo?: string;
  costMin?: string;
  costMax?: string;
  unassigned?: string;
  createdAfter?: string;
}

export const assetsApi = {
  ...createEntityApi<Asset, CreateAssetRequest, UpdateAssetRequest, AssetQueryParams>("/assets"),

  getHistory(id: string, limit?: number): Promise<AssetHistory[]> {
    const params = limit ? `?limit=${limit}` : "";
    return apiClient.get<AssetHistory[]>(`/assets/${id}/history${params}`);
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

  bulkArchive(ids: string[]): Promise<{ succeeded: number; failed: number }> {
    return apiClient.post("/assets/bulk-archive", { ids });
  },

  bulkStatus(ids: string[], status: string): Promise<{ succeeded: number; failed: number }> {
    return apiClient.post("/assets/bulk-status", { ids, status });
  },

  bulkEdit(request: BulkEditAssetsRequest): Promise<{ succeeded: number; failed: number }> {
    return apiClient.post("/assets/bulk-edit", request);
  },

  exportCsv(params: Omit<AssetQueryParams, "page" | "pageSize"> & { ids?: string }): Promise<void> {
    return apiClient.downloadCsv("/assets/export", params as Record<string, string | number | undefined>, "assets-export.csv");
  },

  checkDuplicates(data: CheckAssetDuplicatesRequest): Promise<DuplicateCheckResult[]> {
    return apiClient.post<DuplicateCheckResult[]>("/assets/check-duplicates", data);
  },
};
