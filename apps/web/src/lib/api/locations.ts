import { apiClient } from "../api-client";
import { createEntityApi } from "./create-entity-api";
import type {
  Location,
  LocationAsset,
  LocationPerson,
  CreateLocationRequest,
  UpdateLocationRequest,
  ReassignAndArchiveRequest,
} from "../../types/location";
import type { DuplicateCheckResult, CheckLocationDuplicatesRequest } from "../../types/duplicate-check";

export interface LocationQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: string;
}

export const locationsApi = {
  ...createEntityApi<Location, CreateLocationRequest, UpdateLocationRequest, LocationQueryParams>("/locations"),

  getAssets(id: string): Promise<LocationAsset[]> {
    return apiClient.get<LocationAsset[]>(`/locations/${id}/assets`);
  },

  getPeople(id: string): Promise<LocationPerson[]> {
    return apiClient.get<LocationPerson[]>(`/locations/${id}/people`);
  },

  exportCsv(params: Omit<LocationQueryParams, "page" | "pageSize">): Promise<void> {
    return apiClient.downloadCsv("/locations/export", params as Record<string, string | number | undefined>, "locations-export.csv");
  },

  reassignAndArchive(id: string, data: ReassignAndArchiveRequest): Promise<void> {
    return apiClient.post(`/locations/${id}/reassign-and-archive`, data);
  },

  checkDuplicates(data: CheckLocationDuplicatesRequest): Promise<DuplicateCheckResult[]> {
    return apiClient.post<DuplicateCheckResult[]>("/locations/check-duplicates", data);
  },
};
