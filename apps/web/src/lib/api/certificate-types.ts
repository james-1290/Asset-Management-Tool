import { apiClient } from "../api-client";
import type {
  CertificateType,
  CreateCertificateTypeRequest,
  UpdateCertificateTypeRequest,
} from "../../types/certificate-type";
import type { CustomFieldDefinition } from "../../types/custom-field";
import type { PagedResponse } from "../../types/paged-response";

export interface CertificateTypeQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: string;
}

export const certificateTypesApi = {
  getAll(): Promise<CertificateType[]> {
    return apiClient
      .get<PagedResponse<CertificateType>>("/certificate-types", { pageSize: 1000 })
      .then((r) => r.items);
  },

  getPaged(params: CertificateTypeQueryParams): Promise<PagedResponse<CertificateType>> {
    return apiClient.get<PagedResponse<CertificateType>>("/certificate-types", params as Record<string, string | number | undefined>);
  },

  getById(id: string): Promise<CertificateType> {
    return apiClient.get<CertificateType>(`/certificate-types/${id}`);
  },

  create(data: CreateCertificateTypeRequest): Promise<CertificateType> {
    return apiClient.post<CertificateType>("/certificate-types", data);
  },

  update(id: string, data: UpdateCertificateTypeRequest): Promise<CertificateType> {
    return apiClient.put<CertificateType>(`/certificate-types/${id}`, data);
  },

  archive(id: string): Promise<void> {
    return apiClient.delete(`/certificate-types/${id}`);
  },

  bulkArchive(ids: string[]): Promise<{ succeeded: number; failed: number }> {
    return apiClient.post("/certificate-types/bulk-archive", { ids });
  },

  getCustomFields(certificateTypeId: string): Promise<CustomFieldDefinition[]> {
    return apiClient.get<CustomFieldDefinition[]>(`/certificate-types/${certificateTypeId}/customfields`);
  },
};
