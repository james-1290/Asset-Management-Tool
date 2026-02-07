import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { certificateTypesApi } from "../lib/api/certificate-types";
import type { CertificateTypeQueryParams } from "../lib/api/certificate-types";
import type {
  CreateCertificateTypeRequest,
  UpdateCertificateTypeRequest,
} from "../types/certificate-type";

const certificateTypeKeys = {
  all: ["certificateTypes"] as const,
  paged: (params: CertificateTypeQueryParams) => ["certificateTypes", "paged", params] as const,
  detail: (id: string) => ["certificateTypes", id] as const,
  customFields: (id: string) => ["certificateTypes", id, "customFields"] as const,
};

export function useCertificateTypes() {
  return useQuery({
    queryKey: certificateTypeKeys.all,
    queryFn: certificateTypesApi.getAll,
  });
}

export function usePagedCertificateTypes(params: CertificateTypeQueryParams) {
  return useQuery({
    queryKey: certificateTypeKeys.paged(params),
    queryFn: () => certificateTypesApi.getPaged(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateCertificateType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCertificateTypeRequest) => certificateTypesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificateTypeKeys.all });
    },
  });
}

export function useUpdateCertificateType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCertificateTypeRequest }) =>
      certificateTypesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificateTypeKeys.all });
    },
  });
}

export function useArchiveCertificateType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => certificateTypesApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificateTypeKeys.all });
    },
  });
}

export function useCertificateCustomFieldDefinitions(certificateTypeId: string | undefined) {
  return useQuery({
    queryKey: certificateTypeKeys.customFields(certificateTypeId ?? ""),
    queryFn: () => certificateTypesApi.getCustomFields(certificateTypeId!),
    enabled: !!certificateTypeId,
  });
}
