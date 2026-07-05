import { apiClient } from "../api-client";
import { createEntityApi } from "./create-entity-api";
import type {
  CertificateType,
  CreateCertificateTypeRequest,
  UpdateCertificateTypeRequest,
} from "../../types/certificate-type";
import type { CustomFieldDefinition } from "../../types/custom-field";

export interface CertificateTypeQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: string;
}

export const certificateTypesApi = {
  ...createEntityApi<CertificateType, CreateCertificateTypeRequest, UpdateCertificateTypeRequest, CertificateTypeQueryParams>("/certificate-types"),

  bulkArchive(ids: string[]): Promise<{ succeeded: number; failed: number }> {
    return apiClient.post("/certificate-types/bulk-archive", { ids });
  },

  getCustomFields(certificateTypeId: string): Promise<CustomFieldDefinition[]> {
    return apiClient.get<CustomFieldDefinition[]>(`/certificate-types/${certificateTypeId}/customfields`);
  },
};
