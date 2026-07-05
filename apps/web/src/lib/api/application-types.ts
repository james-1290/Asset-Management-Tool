import { apiClient } from "../api-client";
import { createEntityApi } from "./create-entity-api";
import type {
  ApplicationType,
  CreateApplicationTypeRequest,
  UpdateApplicationTypeRequest,
} from "../../types/application-type";
import type { CustomFieldDefinition } from "../../types/custom-field";

export interface ApplicationTypeQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: string;
}

export const applicationTypesApi = {
  ...createEntityApi<ApplicationType, CreateApplicationTypeRequest, UpdateApplicationTypeRequest, ApplicationTypeQueryParams>("/application-types"),

  bulkArchive(ids: string[]): Promise<{ succeeded: number; failed: number }> {
    return apiClient.post("/application-types/bulk-archive", { ids });
  },

  getCustomFields(applicationTypeId: string): Promise<CustomFieldDefinition[]> {
    return apiClient.get<CustomFieldDefinition[]>(`/application-types/${applicationTypeId}/customfields`);
  },
};
