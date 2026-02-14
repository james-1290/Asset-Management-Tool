import { apiClient } from "../api-client";
import type {
  Person,
  PersonSearchResult,
  PersonHistory,
  AssignedAsset,
  PersonSummary,
  AssignedCertificate,
  AssignedApplication,
  CreatePersonRequest,
  UpdatePersonRequest,
  OffboardRequest,
  OffboardResult,
} from "../../types/person";
import type { PagedResponse } from "../../types/paged-response";
import type { DuplicateCheckResult, CheckPersonDuplicatesRequest } from "../../types/duplicate-check";

export interface PersonQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: string;
}

export const peopleApi = {
  getAll(): Promise<Person[]> {
    return apiClient
      .get<PagedResponse<Person>>("/people", { pageSize: 1000 })
      .then((r) => r.items);
  },

  getPaged(params: PersonQueryParams): Promise<PagedResponse<Person>> {
    return apiClient.get<PagedResponse<Person>>("/people", params as Record<string, string | number | undefined>);
  },

  getById(id: string): Promise<Person> {
    return apiClient.get<Person>(`/people/${id}`);
  },

  create(data: CreatePersonRequest): Promise<Person> {
    return apiClient.post<Person>("/people", data);
  },

  update(id: string, data: UpdatePersonRequest): Promise<Person> {
    return apiClient.put<Person>(`/people/${id}`, data);
  },

  archive(id: string): Promise<void> {
    return apiClient.delete(`/people/${id}`);
  },

  bulkArchive(ids: string[]): Promise<{ succeeded: number; failed: number }> {
    return apiClient.post("/people/bulk-archive", { ids });
  },

  search(q: string, limit = 5): Promise<PersonSearchResult[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (q) params.set("q", q);
    return apiClient.get<PersonSearchResult[]>(`/people/search?${params}`);
  },

  getHistory(id: string, limit?: number): Promise<PersonHistory[]> {
    const params = limit ? { limit } : undefined;
    return apiClient.get<PersonHistory[]>(`/people/${id}/history`, params as Record<string, string | number | undefined>);
  },

  getAssignedAssets(id: string): Promise<AssignedAsset[]> {
    return apiClient.get<AssignedAsset[]>(`/people/${id}/assets`);
  },

  exportCsv(params: Omit<PersonQueryParams, "page" | "pageSize"> & { ids?: string }): Promise<void> {
    return apiClient.downloadCsv("/people/export", params as Record<string, string | number | undefined>, "people-export.csv");
  },

  checkDuplicates(data: CheckPersonDuplicatesRequest): Promise<DuplicateCheckResult[]> {
    return apiClient.post<DuplicateCheckResult[]>("/people/check-duplicates", data);
  },

  getSummary(id: string): Promise<PersonSummary> {
    return apiClient.get<PersonSummary>(`/people/${id}/summary`);
  },

  getCertificates(id: string): Promise<AssignedCertificate[]> {
    return apiClient.get<AssignedCertificate[]>(`/people/${id}/certificates`);
  },

  getApplications(id: string): Promise<AssignedApplication[]> {
    return apiClient.get<AssignedApplication[]>(`/people/${id}/applications`);
  },

  offboard(id: string, request: OffboardRequest): Promise<OffboardResult> {
    return apiClient.post<OffboardResult>(`/people/${id}/offboard`, request);
  },
};
