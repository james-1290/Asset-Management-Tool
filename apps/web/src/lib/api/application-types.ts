import { apiClient } from "../api-client";
import type {
  ApplicationType,
  CreateApplicationTypeRequest,
  UpdateApplicationTypeRequest,
} from "../../types/application-type";
import type { CustomFieldDefinition } from "../../types/custom-field";
import type { PagedResponse } from "../../types/paged-response";

export interface ApplicationTypeQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: string;
}

export const applicationTypesApi = {
  getAll(): Promise<ApplicationType[]> {
    return apiClient
      .get<PagedResponse<ApplicationType>>("/application-types", { pageSize: 1000 })
      .then((r) => r.items);
  },

  getPaged(params: ApplicationTypeQueryParams): Promise<PagedResponse<ApplicationType>> {
    return apiClient.get<PagedResponse<ApplicationType>>("/application-types", params as Record<string, string | number | undefined>);
  },

  getById(id: string): Promise<ApplicationType> {
    return apiClient.get<ApplicationType>(`/application-types/${id}`);
  },

  create(data: CreateApplicationTypeRequest): Promise<ApplicationType> {
    return apiClient.post<ApplicationType>("/application-types", data);
  },

  update(id: string, data: UpdateApplicationTypeRequest): Promise<ApplicationType> {
    return apiClient.put<ApplicationType>(`/application-types/${id}`, data);
  },

  archive(id: string): Promise<void> {
    return apiClient.delete(`/application-types/${id}`);
  },

  bulkArchive(ids: string[]): Promise<{ succeeded: number; failed: number }> {
    return apiClient.post("/application-types/bulk-archive", { ids });
  },

  getCustomFields(applicationTypeId: string): Promise<CustomFieldDefinition[]> {
    return apiClient.get<CustomFieldDefinition[]>(`/application-types/${applicationTypeId}/customfields`);
  },
};
