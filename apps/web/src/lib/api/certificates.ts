import { apiClient } from "../api-client";
import { createEntityApi } from "./create-entity-api";
import type {
  Certificate,
  CreateCertificateRequest,
  UpdateCertificateRequest,
} from "../../types/certificate";
import type { CertificateHistory } from "../../types/certificate-history";
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
  ...createEntityApi<Certificate, CreateCertificateRequest, UpdateCertificateRequest, CertificateQueryParams>("/certificates"),

  getHistory(id: string, limit?: number): Promise<CertificateHistory[]> {
    const params = limit ? `?limit=${limit}` : "";
    return apiClient.get<CertificateHistory[]>(`/certificates/${id}/history${params}`);
  },

  renew(id: string, data: { newExpiryDate: string; notes?: string }): Promise<Certificate> {
    return apiClient.post<Certificate>(`/certificates/${id}/renew`, data);
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
