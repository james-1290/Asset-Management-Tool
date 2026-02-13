import { apiClient } from "../api-client";
import type {
  AssetTemplate,
  CreateAssetTemplateRequest,
  UpdateAssetTemplateRequest,
} from "../../types/asset-template";

export const assetTemplatesApi = {
  getAll(assetTypeId?: string): Promise<AssetTemplate[]> {
    const params = assetTypeId ? { assetTypeId } : undefined;
    return apiClient.get<AssetTemplate[]>("/asset-templates", params as Record<string, string> | undefined);
  },

  getById(id: string): Promise<AssetTemplate> {
    return apiClient.get<AssetTemplate>(`/asset-templates/${id}`);
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
};
