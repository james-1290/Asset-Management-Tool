import { apiClient } from "../api-client";
import type { PagedResponse } from "../../types/paged-response";

/**
 * The CRUD core shared by every entity API module (assets, certificates,
 * applications, locations, people). Spread the result into an entity's API
 * object and add its unique endpoints alongside:
 *
 *   export const assetsApi = {
 *     ...createEntityApi<Asset, CreateAssetRequest, UpdateAssetRequest, AssetQueryParams>("/assets"),
 *     getHistory(...) { ... },
 *     checkout(...) { ... },
 *   };
 */
export function createEntityApi<T, TCreate, TUpdate, TParams>(path: string) {
  return {
    getAll: (): Promise<T[]> =>
      apiClient
        .get<PagedResponse<T>>(path, { pageSize: 1000 })
        .then((r) => r.items),

    getPaged: (params: TParams): Promise<PagedResponse<T>> =>
      apiClient.get<PagedResponse<T>>(
        path,
        params as Record<string, string | number | undefined>,
      ),

    getById: (id: string): Promise<T> => apiClient.get<T>(`${path}/${id}`),

    create: (data: TCreate): Promise<T> => apiClient.post<T>(path, data),

    update: (id: string, data: TUpdate): Promise<T> =>
      apiClient.put<T>(`${path}/${id}`, data),

    archive: (id: string): Promise<void> => apiClient.delete(`${path}/${id}`),
  };
}
