import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEntityHooks, entityWriteInvalidations, type EntityInvalidation } from "./create-entity-hooks";
import { assetsApi } from "../lib/api/assets";
import type { AssetQueryParams } from "../lib/api/assets";
import type {
  Asset,
  CreateAssetRequest,
  UpdateAssetRequest,
  CheckoutAssetRequest,
  CheckinAssetRequest,
  RetireAssetRequest,
  SellAssetRequest,
  BulkEditAssetsRequest,
} from "../types/asset";
import type { CheckAssetDuplicatesRequest } from "../types/duplicate-check";

const assetInvalidation: EntityInvalidation = { root: "assets", historyOnUpdate: true };

const assetHooks = createEntityHooks<Asset, CreateAssetRequest, UpdateAssetRequest, AssetQueryParams>(
  assetInvalidation,
  assetsApi,
);

export const usePagedAssets = assetHooks.usePaged;
export const useAsset = assetHooks.useDetail;
export const useCreateAsset = assetHooks.useCreate;
export const useUpdateAsset = assetHooks.useUpdate;
export const useArchiveAsset = assetHooks.useArchive;
export const useBulkArchiveAssets = assetHooks.useBulkArchive;

// Actions that mutate a single asset invalidate the same keys as an update.
function useAssetAction<TData>(action: (vars: { id: string; data: TData }) => Promise<Asset>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (_data, variables) => {
      for (const queryKey of entityWriteInvalidations(assetInvalidation, "update", variables.id)) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

export function useAssetHistory(id: string, limit?: number) {
  return useQuery({
    queryKey: ["assets", id, "history", limit] as const,
    queryFn: () => assetsApi.getHistory(id, limit),
    enabled: !!id,
  });
}

export function useCheckoutAsset() {
  return useAssetAction<CheckoutAssetRequest>(({ id, data }) => assetsApi.checkout(id, data));
}

export function useCheckinAsset() {
  return useAssetAction<CheckinAssetRequest>(({ id, data }) => assetsApi.checkin(id, data));
}

export function useRetireAsset() {
  return useAssetAction<RetireAssetRequest>(({ id, data }) => assetsApi.retire(id, data));
}

export function useSellAsset() {
  return useAssetAction<SellAssetRequest>(({ id, data }) => assetsApi.sell(id, data));
}

export function useCheckAssetDuplicates() {
  return useMutation({
    mutationFn: (data: CheckAssetDuplicatesRequest) => assetsApi.checkDuplicates(data),
  });
}

export function useBulkStatusAssets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      assetsApi.bulkStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useBulkEditAssets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: BulkEditAssetsRequest) => assetsApi.bulkEdit(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
