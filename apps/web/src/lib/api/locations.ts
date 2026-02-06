import { apiClient } from "../api-client";
import type {
  Location,
  CreateLocationRequest,
  UpdateLocationRequest,
} from "../../types/location";

export const locationsApi = {
  getAll(): Promise<Location[]> {
    return apiClient.get<Location[]>("/locations");
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

  archive(id: string): Promise<void> {
    return apiClient.delete(`/locations/${id}`);
  },
};
