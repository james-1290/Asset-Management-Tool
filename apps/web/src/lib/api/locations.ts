import { apiClient } from "../api-client";
import type {
  Location,
  LocationAsset,
  LocationPerson,
  CreateLocationRequest,
  UpdateLocationRequest,
} from "../../types/location";
import type { PagedResponse } from "../../types/paged-response";

export interface LocationQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: string;
}

export const locationsApi = {
  getAll(): Promise<Location[]> {
    return apiClient
      .get<PagedResponse<Location>>("/locations", { pageSize: 1000 })
      .then((r) => r.items);
  },

  getPaged(params: LocationQueryParams): Promise<PagedResponse<Location>> {
    return apiClient.get<PagedResponse<Location>>("/locations", params as Record<string, string | number | undefined>);
  },

  getById(id: string): Promise<Location> {
    return apiClient.get<Location>(`/locations/${id}`);
  },

  create(data: CreateLocationRequest): Promise<Location> {
    return apiClient.post<Location>("/locations", data);
  },

  update(id: string, data: UpdateLocationRequest): Promise<Location> {
    return apiClient.put<Location>(`/locations/${id}`, data);
  },

  getAssets(id: string): Promise<LocationAsset[]> {
    return apiClient.get<LocationAsset[]>(`/locations/${id}/assets`);
  },

  getPeople(id: string): Promise<LocationPerson[]> {
    return apiClient.get<LocationPerson[]>(`/locations/${id}/people`);
  },

  archive(id: string): Promise<void> {
    return apiClient.delete(`/locations/${id}`);
  },

  exportCsv(params: Omit<LocationQueryParams, "page" | "pageSize">): Promise<void> {
    return apiClient.downloadCsv("/locations/export", params as Record<string, string | number | undefined>, "locations-export.csv");
  },
};
