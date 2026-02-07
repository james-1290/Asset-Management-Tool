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
      .get<PagedResponse<CertificateType>>("/certificatetypes", { pageSize: 1000 })
      .then((r) => r.items);
  },

  getPaged(params: CertificateTypeQueryParams): Promise<PagedResponse<CertificateType>> {
    return apiClient.get<PagedResponse<CertificateType>>("/certificatetypes", params as Record<string, string | number | undefined>);
  },

  getById(id: string): Promise<CertificateType> {
    return apiClient.get<CertificateType>(`/certificatetypes/${id}`);
  },

  create(data: CreateCertificateTypeRequest): Promise<CertificateType> {
    return apiClient.post<CertificateType>("/certificatetypes", data);
  },

  update(id: string, data: UpdateCertificateTypeRequest): Promise<CertificateType> {
    return apiClient.put<CertificateType>(`/certificatetypes/${id}`, data);
  },

  archive(id: string): Promise<void> {
    return apiClient.delete(`/certificatetypes/${id}`);
  },

  getCustomFields(certificateTypeId: string): Promise<CustomFieldDefinition[]> {
    return apiClient.get<CustomFieldDefinition[]>(`/certificatetypes/${certificateTypeId}/customfields`);
  },
};
