import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { locationsApi } from "../lib/api/locations";
import type {
  CreateLocationRequest,
  UpdateLocationRequest,
} from "../types/location";

const locationKeys = {
  all: ["locations"] as const,
  detail: (id: string) => ["locations", id] as const,
};

export function useLocations() {
  return useQuery({
    queryKey: locationKeys.all,
    queryFn: locationsApi.getAll,
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

export function useArchiveLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => locationsApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
    },
  });
}
