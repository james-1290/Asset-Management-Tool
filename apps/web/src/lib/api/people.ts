import { apiClient } from "../api-client";
import type {
  Person,
  PersonSearchResult,
  CreatePersonRequest,
  UpdatePersonRequest,
} from "../../types/person";

export const peopleApi = {
  getAll(): Promise<Person[]> {
    return apiClient.get<Person[]>("/people");
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

  search(q: string, limit = 5): Promise<PersonSearchResult[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (q) params.set("q", q);
    return apiClient.get<PersonSearchResult[]>(`/people/search?${params}`);
  },
};
