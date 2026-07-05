import { useQuery } from "@tanstack/react-query";
import { createEntityHooks } from "./create-entity-hooks";
import { assetTypesApi } from "../lib/api/asset-types";
import type { AssetTypeQueryParams } from "../lib/api/asset-types";
import type {
  AssetType,
  CreateAssetTypeRequest,
  UpdateAssetTypeRequest,
} from "../types/asset-type";

// assetTypeName is denormalised onto assets and asset-models, so a type update
// refreshes those lists too. Type writes don't touch the dashboard (related: []).
const assetTypeHooks = createEntityHooks<
  AssetType,
  CreateAssetTypeRequest,
  UpdateAssetTypeRequest,
  AssetTypeQueryParams
>(
  { root: "assetTypes", related: [], crossEntityOnUpdate: ["assets", "asset-models"] },
  assetTypesApi,
);

export const useAssetTypes = assetTypeHooks.useAll;
export const usePagedAssetTypes = assetTypeHooks.usePaged;
export const useCreateAssetType = assetTypeHooks.useCreate;
export const useUpdateAssetType = assetTypeHooks.useUpdate;
export const useArchiveAssetType = assetTypeHooks.useArchive;
export const useBulkArchiveAssetTypes = assetTypeHooks.useBulkArchive;

export function useCustomFieldDefinitions(assetTypeId: string | undefined) {
  return useQuery({
    queryKey: [...assetTypeHooks.keys.detail(assetTypeId ?? ""), "customFields"],
    queryFn: () => assetTypesApi.getCustomFields(assetTypeId!),
    enabled: !!assetTypeId,
  });
}
