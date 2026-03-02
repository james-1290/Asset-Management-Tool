import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assetModelsApi } from "../lib/api/asset-models";
import type { CreateAssetModelRequest, UpdateAssetModelRequest } from "../types/asset-model";

const assetModelKeys = {
  all: ["asset-models"] as const,
  list: (assetTypeId?: string) => ["asset-models", { assetTypeId }] as const,
  detail: (id: string) => ["asset-models", id] as const,
};

export function useAssetModels(assetTypeId?: string) {
  return useQuery({
    queryKey: assetModelKeys.list(assetTypeId),
    queryFn: () => assetModelsApi.getAll(assetTypeId),
  });
}

export function useAssetModel(id: string) {
  return useQuery({
    queryKey: assetModelKeys.detail(id),
    queryFn: () => assetModelsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateAssetModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAssetModelRequest) => assetModelsApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: assetModelKeys.all }); },
  });
}

export function useUpdateAssetModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssetModelRequest }) => assetModelsApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: assetModelKeys.all });
      queryClient.invalidateQueries({ queryKey: assetModelKeys.detail(variables.id) });
    },
  });
}

export function useArchiveAssetModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetModelsApi.archive(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: assetModelKeys.all }); },
  });
}
