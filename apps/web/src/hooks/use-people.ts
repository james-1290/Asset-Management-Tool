import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { peopleApi } from "../lib/api/people";
import type { PersonQueryParams } from "../lib/api/people";
import type {
  CreatePersonRequest,
  UpdatePersonRequest,
} from "../types/person";

const personKeys = {
  all: ["people"] as const,
  paged: (params: PersonQueryParams) => ["people", "paged", params] as const,
  detail: (id: string) => ["people", id] as const,
  search: (q: string) => ["people", "search", q] as const,
  history: (id: string, limit?: number) => ["people", id, "history", limit] as const,
  assets: (id: string) => ["people", id, "assets"] as const,
};

export function usePeople() {
  return useQuery({
    queryKey: personKeys.all,
    queryFn: peopleApi.getAll,
  });
}

export function usePagedPeople(params: PersonQueryParams) {
  return useQuery({
    queryKey: personKeys.paged(params),
    queryFn: () => peopleApi.getPaged(params),
    placeholderData: keepPreviousData,
  });
}

export function usePeopleSearch(query: string) {
  return useQuery({
    queryKey: personKeys.search(query),
    queryFn: () => peopleApi.search(query),
    placeholderData: keepPreviousData,
  });
}

export function usePerson(id: string) {
  return useQuery({
    queryKey: personKeys.detail(id),
    queryFn: () => peopleApi.getById(id),
  });
}

export function usePersonHistory(id: string, limit?: number) {
  return useQuery({
    queryKey: personKeys.history(id, limit),
    queryFn: () => peopleApi.getHistory(id, limit),
  });
}

export function usePersonAssets(id: string) {
  return useQuery({
    queryKey: personKeys.assets(id),
    queryFn: () => peopleApi.getAssignedAssets(id),
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePersonRequest) => peopleApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.all });
    },
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePersonRequest }) =>
      peopleApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.all });
    },
  });
}

export function useArchivePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => peopleApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.all });
    },
  });
}

export function useBulkArchivePeople() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => peopleApi.bulkArchive(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.all });
    },
  });
}
