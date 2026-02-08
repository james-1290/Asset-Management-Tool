import { apiClient } from "../api-client";
import type {
  Person,
  PersonSearchResult,
  PersonHistory,
  AssignedAsset,
  CreatePersonRequest,
  UpdatePersonRequest,
} from "../../types/person";
import type { PagedResponse } from "../../types/paged-response";

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
};
