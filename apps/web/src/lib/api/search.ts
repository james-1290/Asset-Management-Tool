import { apiClient } from "../api-client";

export interface SearchResultItem {
  id: string;
  name: string;
  subtitle?: string;
  extra?: string;
}

export interface SearchCounts {
  assets: number;
  certificates: number;
  applications: number;
  people: number;
  locations: number;
}

export interface SearchResponse {
  assets: SearchResultItem[];
  certificates: SearchResultItem[];
  applications: SearchResultItem[];
  people: SearchResultItem[];
  locations: SearchResultItem[];
  counts: SearchCounts;
}

export const searchApi = {
  search(q: string, limit = 5): Promise<SearchResponse> {
    return apiClient.get<SearchResponse>("/search", { q, limit });
  },
};
