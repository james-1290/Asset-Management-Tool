import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assetTypesApi } from "../lib/api/asset-types";
import type {
  CreateAssetTypeRequest,
  UpdateAssetTypeRequest,
} from "../types/asset-type";

const assetTypeKeys = {
  all: ["assetTypes"] as const,
  detail: (id: string) => ["assetTypes", id] as const,
  customFields: (id: string) => ["assetTypes", id, "customFields"] as const,
};

export function useAssetTypes() {
  return useQuery({
    queryKey: assetTypeKeys.all,
    queryFn: assetTypesApi.getAll,
  });
}

export function useCreateAssetType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssetTypeRequest) => assetTypesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetTypeKeys.all });
    },
  });
}

export function useUpdateAssetType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssetTypeRequest }) =>
      assetTypesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetTypeKeys.all });
    },
  });
}

export function useArchiveAssetType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => assetTypesApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetTypeKeys.all });
    },
  });
}

export function useCustomFieldDefinitions(assetTypeId: string | undefined) {
  return useQuery({
    queryKey: assetTypeKeys.customFields(assetTypeId ?? ""),
    queryFn: () => assetTypesApi.getCustomFields(assetTypeId!),
    enabled: !!assetTypeId,
  });
}
