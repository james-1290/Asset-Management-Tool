import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assetsApi } from "../lib/api/assets";
import type {
  CreateAssetRequest,
  UpdateAssetRequest,
  CheckoutAssetRequest,
  CheckinAssetRequest,
} from "../types/asset";

const assetKeys = {
  all: ["assets"] as const,
  detail: (id: string) => ["assets", id] as const,
  history: (id: string, limit?: number) => ["assets", id, "history", limit] as const,
};

export function useAssets() {
  return useQuery({
    queryKey: assetKeys.all,
    queryFn: assetsApi.getAll,
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: () => assetsApi.getById(id),
    enabled: !!id,
  });
}

export function useAssetHistory(id: string, limit?: number) {
  return useQuery({
    queryKey: assetKeys.history(id, limit),
    queryFn: () => assetsApi.getHistory(id, limit),
    enabled: !!id,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssetRequest) => assetsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssetRequest }) =>
      assetsApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["assets", variables.id, "history"] });
    },
  });
}

export function useCheckoutAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CheckoutAssetRequest }) =>
      assetsApi.checkout(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["assets", variables.id, "history"] });
    },
  });
}

export function useCheckinAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CheckinAssetRequest }) =>
      assetsApi.checkin(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["assets", variables.id, "history"] });
    },
  });
}

export function useArchiveAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => assetsApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}
