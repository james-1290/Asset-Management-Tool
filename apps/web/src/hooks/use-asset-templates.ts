import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assetTemplatesApi } from "../lib/api/asset-templates";
import type {
  CreateAssetTemplateRequest,
  UpdateAssetTemplateRequest,
} from "../types/asset-template";

const assetTemplateKeys = {
  all: ["asset-templates"] as const,
  list: (assetTypeId?: string) => ["asset-templates", { assetTypeId }] as const,
  detail: (id: string) => ["asset-templates", id] as const,
};

export function useAssetTemplates(assetTypeId?: string) {
  return useQuery({
    queryKey: assetTemplateKeys.list(assetTypeId),
    queryFn: () => assetTemplatesApi.getAll(assetTypeId),
  });
}

export function useAssetTemplate(id: string) {
  return useQuery({
    queryKey: assetTemplateKeys.detail(id),
    queryFn: () => assetTemplatesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateAssetTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssetTemplateRequest) => assetTemplatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetTemplateKeys.all });
    },
  });
}

export function useUpdateAssetTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssetTemplateRequest }) =>
      assetTemplatesApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: assetTemplateKeys.all });
      queryClient.invalidateQueries({ queryKey: assetTemplateKeys.detail(variables.id) });
    },
  });
}

export function useArchiveAssetTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => assetTemplatesApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetTemplateKeys.all });
    },
  });
}
