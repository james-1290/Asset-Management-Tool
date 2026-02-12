import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { locationsApi } from "../lib/api/locations";
import type { LocationQueryParams } from "../lib/api/locations";
import type {
  CreateLocationRequest,
  UpdateLocationRequest,
} from "../types/location";
import type { CheckLocationDuplicatesRequest } from "../types/duplicate-check";

const locationKeys = {
  all: ["locations"] as const,
  paged: (params: LocationQueryParams) => ["locations", "paged", params] as const,
  detail: (id: string) => ["locations", id] as const,
};

export function useLocations() {
  return useQuery({
    queryKey: locationKeys.all,
    queryFn: locationsApi.getAll,
  });
}

export function usePagedLocations(params: LocationQueryParams) {
  return useQuery({
    queryKey: locationKeys.paged(params),
    queryFn: () => locationsApi.getPaged(params),
    placeholderData: keepPreviousData,
  });
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: locationKeys.detail(id),
    queryFn: () => locationsApi.getById(id),
    enabled: !!id,
  });
}

export function useLocationAssets(id: string) {
  return useQuery({
    queryKey: [...locationKeys.detail(id), "assets"] as const,
    queryFn: () => locationsApi.getAssets(id),
    enabled: !!id,
  });
}

export function useLocationPeople(id: string) {
  return useQuery({
    queryKey: [...locationKeys.detail(id), "people"] as const,
    queryFn: () => locationsApi.getPeople(id),
    enabled: !!id,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLocationRequest) => locationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLocationRequest }) =>
      locationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
    },
  });
}

export function useCheckLocationDuplicates() {
  return useMutation({
    mutationFn: (data: CheckLocationDuplicatesRequest) => locationsApi.checkDuplicates(data),
  });
}

export function useArchiveLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => locationsApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
    },
  });
}
