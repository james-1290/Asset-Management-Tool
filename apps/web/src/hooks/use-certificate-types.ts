import { useQuery } from "@tanstack/react-query";
import { createEntityHooks } from "./create-entity-hooks";
import { certificateTypesApi } from "../lib/api/certificate-types";
import type { CertificateTypeQueryParams } from "../lib/api/certificate-types";
import type {
  CertificateType,
  CreateCertificateTypeRequest,
  UpdateCertificateTypeRequest,
} from "../types/certificate-type";

const certificateTypeHooks = createEntityHooks<
  CertificateType,
  CreateCertificateTypeRequest,
  UpdateCertificateTypeRequest,
  CertificateTypeQueryParams
>(
  { root: "certificateTypes", related: [] },
  certificateTypesApi,
);

export const useCertificateTypes = certificateTypeHooks.useAll;
export const usePagedCertificateTypes = certificateTypeHooks.usePaged;
export const useCreateCertificateType = certificateTypeHooks.useCreate;
export const useUpdateCertificateType = certificateTypeHooks.useUpdate;
export const useArchiveCertificateType = certificateTypeHooks.useArchive;
export const useBulkArchiveCertificateTypes = certificateTypeHooks.useBulkArchive;

export function useCertificateCustomFieldDefinitions(certificateTypeId: string | undefined) {
  return useQuery({
    queryKey: [...certificateTypeHooks.keys.detail(certificateTypeId ?? ""), "customFields"],
    queryFn: () => certificateTypesApi.getCustomFields(certificateTypeId!),
    enabled: !!certificateTypeId,
  });
}
