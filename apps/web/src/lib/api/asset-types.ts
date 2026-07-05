import { apiClient } from "../api-client";
import { createEntityApi } from "./create-entity-api";
import type {
  AssetType,
  CreateAssetTypeRequest,
  UpdateAssetTypeRequest,
} from "../../types/asset-type";
import type { CustomFieldDefinition } from "../../types/custom-field";

export interface AssetTypeQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: string;
}

export const assetTypesApi = {
  ...createEntityApi<AssetType, CreateAssetTypeRequest, UpdateAssetTypeRequest, AssetTypeQueryParams>("/asset-types"),

  bulkArchive(ids: string[]): Promise<{ succeeded: number; failed: number }> {
    return apiClient.post("/asset-types/bulk-archive", { ids });
  },

  getCustomFields(assetTypeId: string): Promise<CustomFieldDefinition[]> {
    return apiClient.get<CustomFieldDefinition[]>(`/asset-types/${assetTypeId}/customfields`);
  },
};
