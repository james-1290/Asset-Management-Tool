import { apiClient } from "../api-client";
import type {
  AssetTemplate,
  CreateAssetTemplateRequest,
  UpdateAssetTemplateRequest,
} from "../../types/asset-template";

export const assetTemplatesApi = {
  getAll(assetTypeId?: string, includeArchived?: boolean): Promise<AssetTemplate[]> {
    const params: Record<string, string> = {};
    if (assetTypeId) params.assetTypeId = assetTypeId;
    if (includeArchived) params.includeArchived = "true";
    return apiClient.get<AssetTemplate[]>(
      "/asset-templates",
      Object.keys(params).length ? params : undefined,
    );
  },

  create(data: CreateAssetTemplateRequest): Promise<AssetTemplate> {
    return apiClient.post<AssetTemplate>("/asset-templates", data);
  },

  update(id: string, data: UpdateAssetTemplateRequest): Promise<AssetTemplate> {
    return apiClient.put<AssetTemplate>(`/asset-templates/${id}`, data);
  },

  archive(id: string): Promise<void> {
    return apiClient.delete(`/asset-templates/${id}`);
  },

  /** Undoes an archive; these modules don't use createEntityApi. */
  restore(id: string): Promise<AssetTemplate> {
    return apiClient.post<AssetTemplate>(`/asset-templates/${id}/restore`, {});
  },
};
