import { apiClient } from "../api-client";

export interface SearchResultItem {
  id: string;
  name: string;
  subtitle?: string;
}

export interface SearchResponse {
  assets: SearchResultItem[];
  certificates: SearchResultItem[];
  applications: SearchResultItem[];
  people: SearchResultItem[];
  locations: SearchResultItem[];
}

export const searchApi = {
  search(q: string, limit = 5): Promise<SearchResponse> {
    return apiClient.get<SearchResponse>("/search", { q, limit });
  },
};
