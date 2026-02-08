import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { certificatesApi } from "../lib/api/certificates";
import type { CertificateQueryParams } from "../lib/api/certificates";
import type {
  CreateCertificateRequest,
  UpdateCertificateRequest,
} from "../types/certificate";

const certificateKeys = {
  all: ["certificates"] as const,
  paged: (params: CertificateQueryParams) => ["certificates", "paged", params] as const,
  detail: (id: string) => ["certificates", id] as const,
  history: (id: string, limit?: number) => ["certificates", id, "history", limit] as const,
};

export function useCertificates() {
  return useQuery({
    queryKey: certificateKeys.all,
    queryFn: certificatesApi.getAll,
  });
}

export function usePagedCertificates(params: CertificateQueryParams) {
  return useQuery({
    queryKey: certificateKeys.paged(params),
    queryFn: () => certificatesApi.getPaged(params),
    placeholderData: keepPreviousData,
  });
}

export function useCertificate(id: string) {
  return useQuery({
    queryKey: certificateKeys.detail(id),
    queryFn: () => certificatesApi.getById(id),
    enabled: !!id,
  });
}

export function useCertificateHistory(id: string, limit?: number) {
  return useQuery({
    queryKey: certificateKeys.history(id, limit),
    queryFn: () => certificatesApi.getHistory(id, limit),
    enabled: !!id,
  });
}

export function useCreateCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCertificateRequest) => certificatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificateKeys.all });
    },
  });
}

export function useUpdateCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCertificateRequest }) =>
      certificatesApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: certificateKeys.all });
      queryClient.invalidateQueries({ queryKey: certificateKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["certificates", variables.id, "history"] });
    },
  });
}

export function useArchiveCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => certificatesApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificateKeys.all });
    },
  });
}

export function useBulkArchiveCertificates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => certificatesApi.bulkArchive(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificateKeys.all });
    },
  });
}

export function useBulkStatusCertificates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      certificatesApi.bulkStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificateKeys.all });
    },
  });
}
