import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { savedViewsApi } from "../lib/api/saved-views";

const savedViewKeys = {
  all: ["saved-views"] as const,
  byEntity: (entityType: string) => ["saved-views", entityType] as const,
};

export function useSavedViews(entityType: string) {
  return useQuery({
    queryKey: savedViewKeys.byEntity(entityType),
    queryFn: () => savedViewsApi.getAll(entityType),
  });
}

export function useCreateSavedView(entityType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { entityType: string; name: string; configuration: string }) =>
      savedViewsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedViewKeys.byEntity(entityType) });
    },
  });
}

export function useUpdateSavedView(entityType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; configuration: string } }) =>
      savedViewsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedViewKeys.byEntity(entityType) });
    },
  });
}

export function useDeleteSavedView(entityType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => savedViewsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedViewKeys.byEntity(entityType) });
    },
  });
}

export function useSetDefaultSavedView(entityType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => savedViewsApi.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedViewKeys.byEntity(entityType) });
    },
  });
}
