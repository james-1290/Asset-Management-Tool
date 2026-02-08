import { apiClient } from "../api-client";
import type { SavedView } from "../../types/saved-view";

export const savedViewsApi = {
  getAll(entityType: string): Promise<SavedView[]> {
    return apiClient.get<SavedView[]>("/saved-views", { entityType });
  },

  create(data: { entityType: string; name: string; configuration: string }): Promise<SavedView> {
    return apiClient.post<SavedView>("/saved-views", data);
  },

  update(id: string, data: { name: string; configuration: string }): Promise<SavedView> {
    return apiClient.put<SavedView>(`/saved-views/${id}`, data);
  },

  remove(id: string): Promise<void> {
    return apiClient.delete(`/saved-views/${id}`);
  },

  setDefault(id: string): Promise<SavedView> {
    return apiClient.put<SavedView>(`/saved-views/${id}/default`, {});
  },
};
