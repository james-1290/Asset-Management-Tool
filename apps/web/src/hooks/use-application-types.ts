import { useQuery } from "@tanstack/react-query";
import { createEntityHooks } from "./create-entity-hooks";
import { applicationTypesApi } from "../lib/api/application-types";
import type { ApplicationTypeQueryParams } from "../lib/api/application-types";
import type {
  ApplicationType,
  CreateApplicationTypeRequest,
  UpdateApplicationTypeRequest,
} from "../types/application-type";

const applicationTypeHooks = createEntityHooks<
  ApplicationType,
  CreateApplicationTypeRequest,
  UpdateApplicationTypeRequest,
  ApplicationTypeQueryParams
>(
  { root: "applicationTypes", related: [] },
  applicationTypesApi,
);

export const useApplicationTypes = applicationTypeHooks.useAll;
export const usePagedApplicationTypes = applicationTypeHooks.usePaged;
export const useCreateApplicationType = applicationTypeHooks.useCreate;
export const useUpdateApplicationType = applicationTypeHooks.useUpdate;
export const useArchiveApplicationType = applicationTypeHooks.useArchive;
export const useBulkArchiveApplicationTypes = applicationTypeHooks.useBulkArchive;

export function useApplicationCustomFieldDefinitions(applicationTypeId: string | undefined) {
  return useQuery({
    queryKey: [...applicationTypeHooks.keys.detail(applicationTypeId ?? ""), "customFields"],
    queryFn: () => applicationTypesApi.getCustomFields(applicationTypeId!),
    enabled: !!applicationTypeId,
  });
}
