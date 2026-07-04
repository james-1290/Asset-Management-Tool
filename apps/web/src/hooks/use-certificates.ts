import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEntityHooks, entityWriteInvalidations, type EntityInvalidation } from "./create-entity-hooks";
import { certificatesApi } from "../lib/api/certificates";
import type { CertificateQueryParams } from "../lib/api/certificates";
import type {
  Certificate,
  CreateCertificateRequest,
  UpdateCertificateRequest,
} from "../types/certificate";
import type { CheckCertificateDuplicatesRequest } from "../types/duplicate-check";

const certificateInvalidation: EntityInvalidation = { root: "certificates", historyOnUpdate: true };

const certificateHooks = createEntityHooks<
  Certificate,
  CreateCertificateRequest,
  UpdateCertificateRequest,
  CertificateQueryParams
>(certificateInvalidation, certificatesApi);

export const useCertificates = certificateHooks.useAll;
export const usePagedCertificates = certificateHooks.usePaged;
export const useCertificate = certificateHooks.useDetail;
export const useCreateCertificate = certificateHooks.useCreate;
export const useUpdateCertificate = certificateHooks.useUpdate;
export const useArchiveCertificate = certificateHooks.useArchive;
export const useBulkArchiveCertificates = certificateHooks.useBulkArchive;

export function useCertificateHistory(id: string, limit?: number) {
  return useQuery({
    queryKey: ["certificates", id, "history", limit] as const,
    queryFn: () => certificatesApi.getHistory(id, limit),
    enabled: !!id,
  });
}

export function useRenewCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { newExpiryDate: string; notes?: string } }) =>
      certificatesApi.renew(id, data),
    onSuccess: (_data, variables) => {
      for (const queryKey of entityWriteInvalidations(certificateInvalidation, "update", variables.id)) {
        queryClient.invalidateQueries({ queryKey });
      }
      // Renewal clears any pending expiry alerts.
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });
}

export function useCheckCertificateDuplicates() {
  return useMutation({
    mutationFn: (data: CheckCertificateDuplicatesRequest) => certificatesApi.checkDuplicates(data),
  });
}

export function useBulkStatusCertificates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      certificatesApi.bulkStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
