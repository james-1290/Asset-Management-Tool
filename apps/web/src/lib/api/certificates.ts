import { apiClient } from "../api-client";
import type {
  Certificate,
  CreateCertificateRequest,
  UpdateCertificateRequest,
} from "../../types/certificate";
import type { CertificateHistory } from "../../types/certificate-history";
import type { PagedResponse } from "../../types/paged-response";
import type { DuplicateCheckResult, CheckCertificateDuplicatesRequest } from "../../types/duplicate-check";

export interface CertificateQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortDir?: string;
  typeId?: string;
  // Advanced filters
  expiryFrom?: string;
  expiryTo?: string;
}

export const certificatesApi = {
  getAll(): Promise<Certificate[]> {
    return apiClient
      .get<PagedResponse<Certificate>>("/certificates", { pageSize: 1000 })
      .then((r) => r.items);
  },

  getPaged(params: CertificateQueryParams): Promise<PagedResponse<Certificate>> {
    return apiClient.get<PagedResponse<Certificate>>("/certificates", params as Record<string, string | number | undefined>);
  },

  getById(id: string): Promise<Certificate> {
    return apiClient.get<Certificate>(`/certificates/${id}`);
  },

  getHistory(id: string, limit?: number): Promise<CertificateHistory[]> {
    const params = limit ? `?limit=${limit}` : "";
    return apiClient.get<CertificateHistory[]>(`/certificates/${id}/history${params}`);
  },

  create(data: CreateCertificateRequest): Promise<Certificate> {
    return apiClient.post<Certificate>("/certificates", data);
  },

  update(id: string, data: UpdateCertificateRequest): Promise<Certificate> {
    return apiClient.put<Certificate>(`/certificates/${id}`, data);
  },

  archive(id: string): Promise<void> {
    return apiClient.delete(`/certificates/${id}`);
  },

  bulkArchive(ids: string[]): Promise<{ succeeded: number; failed: number }> {
    return apiClient.post("/certificates/bulk-archive", { ids });
  },

  bulkStatus(ids: string[], status: string): Promise<{ succeeded: number; failed: number }> {
    return apiClient.post("/certificates/bulk-status", { ids, status });
  },

  exportCsv(params: Omit<CertificateQueryParams, "page" | "pageSize"> & { ids?: string }): Promise<void> {
    return apiClient.downloadCsv("/certificates/export", params as Record<string, string | number | undefined>, "certificates-export.csv");
  },

  checkDuplicates(data: CheckCertificateDuplicatesRequest): Promise<DuplicateCheckResult[]> {
    return apiClient.post<DuplicateCheckResult[]>("/certificates/check-duplicates", data);
  },
};
