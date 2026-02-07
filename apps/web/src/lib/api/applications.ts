import { apiClient } from "../api-client";
import type {
  Application,
  CreateApplicationRequest,
  UpdateApplicationRequest,
} from "../../types/application";
import type { ApplicationHistory } from "../../types/application-history";
import type { PagedResponse } from "../../types/paged-response";

export interface ApplicationQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortDir?: string;
}

export const applicationsApi = {
  getAll(): Promise<Application[]> {
    return apiClient
      .get<PagedResponse<Application>>("/applications", { pageSize: 1000 })
      .then((r) => r.items);
  },

  getPaged(params: ApplicationQueryParams): Promise<PagedResponse<Application>> {
    return apiClient.get<PagedResponse<Application>>("/applications", params as Record<string, string | number | undefined>);
  },

  getById(id: string): Promise<Application> {
    return apiClient.get<Application>(`/applications/${id}`);
  },

  getHistory(id: string, limit?: number): Promise<ApplicationHistory[]> {
    const params = limit ? `?limit=${limit}` : "";
    return apiClient.get<ApplicationHistory[]>(`/applications/${id}/history${params}`);
  },

  create(data: CreateApplicationRequest): Promise<Application> {
    return apiClient.post<Application>("/applications", data);
  },

  update(id: string, data: UpdateApplicationRequest): Promise<Application> {
    return apiClient.put<Application>(`/applications/${id}`, data);
  },

  archive(id: string): Promise<void> {
    return apiClient.delete(`/applications/${id}`);
  },
};
