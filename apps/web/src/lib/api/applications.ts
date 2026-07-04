import { apiClient } from "../api-client";
import { createEntityApi } from "./create-entity-api";
import type {
  Application,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  DeactivateApplicationRequest,
  ReactivateApplicationRequest,
  SeatAssignment,
} from "../../types/application";
import type { ApplicationHistory } from "../../types/application-history";
import type { DuplicateCheckResult, CheckApplicationDuplicatesRequest } from "../../types/duplicate-check";

export interface ApplicationQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  includeStatuses?: string;
  sortBy?: string;
  sortDir?: string;
  typeId?: string;
  // Advanced filters
  expiryFrom?: string;
  expiryTo?: string;
  licenceType?: string;
  costMin?: string;
  costMax?: string;
  publisher?: string;
}

export const applicationsApi = {
  ...createEntityApi<Application, CreateApplicationRequest, UpdateApplicationRequest, ApplicationQueryParams>("/applications"),

  getHistory(id: string, limit?: number): Promise<ApplicationHistory[]> {
    const params = limit ? `?limit=${limit}` : "";
    return apiClient.get<ApplicationHistory[]>(`/applications/${id}/history${params}`);
  },

  deactivate(id: string, data: DeactivateApplicationRequest): Promise<Application> {
    return apiClient.post<Application>(`/applications/${id}/deactivate`, data);
  },

  reactivate(id: string, data: ReactivateApplicationRequest): Promise<Application> {
    return apiClient.post<Application>(`/applications/${id}/reactivate`, data);
  },

  renew(id: string, data: { newExpiryDate: string; notes?: string }): Promise<Application> {
    return apiClient.post<Application>(`/applications/${id}/renew`, data);
  },

  getSeats(id: string): Promise<SeatAssignment[]> {
    return apiClient.get<SeatAssignment[]>(`/applications/${id}/seats`);
  },

  assignSeat(id: string, data: { personId: string; notes?: string }): Promise<SeatAssignment[]> {
    return apiClient.post<SeatAssignment[]>(`/applications/${id}/seats`, data);
  },

  releaseSeat(id: string, personId: string): Promise<void> {
    return apiClient.delete(`/applications/${id}/seats/${personId}`);
  },

  bulkArchive(ids: string[]): Promise<{ succeeded: number; failed: number }> {
    return apiClient.post("/applications/bulk-archive", { ids });
  },

  bulkStatus(ids: string[], status: string): Promise<{ succeeded: number; failed: number }> {
    return apiClient.post("/applications/bulk-status", { ids, status });
  },

  exportCsv(params: Omit<ApplicationQueryParams, "page" | "pageSize"> & { ids?: string }): Promise<void> {
    return apiClient.downloadCsv("/applications/export", params as Record<string, string | number | undefined>, "applications-export.csv");
  },

  checkDuplicates(data: CheckApplicationDuplicatesRequest): Promise<DuplicateCheckResult[]> {
    return apiClient.post<DuplicateCheckResult[]>("/applications/check-duplicates", data);
  },
};
