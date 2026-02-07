import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { applicationTypesApi } from "../lib/api/application-types";
import type { ApplicationTypeQueryParams } from "../lib/api/application-types";
import type {
  CreateApplicationTypeRequest,
  UpdateApplicationTypeRequest,
} from "../types/application-type";

const applicationTypeKeys = {
  all: ["applicationTypes"] as const,
  paged: (params: ApplicationTypeQueryParams) => ["applicationTypes", "paged", params] as const,
  detail: (id: string) => ["applicationTypes", id] as const,
  customFields: (id: string) => ["applicationTypes", id, "customFields"] as const,
};

export function useApplicationTypes() {
  return useQuery({
    queryKey: applicationTypeKeys.all,
    queryFn: applicationTypesApi.getAll,
  });
}

export function usePagedApplicationTypes(params: ApplicationTypeQueryParams) {
  return useQuery({
    queryKey: applicationTypeKeys.paged(params),
    queryFn: () => applicationTypesApi.getPaged(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateApplicationType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApplicationTypeRequest) => applicationTypesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationTypeKeys.all });
    },
  });
}

export function useUpdateApplicationType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApplicationTypeRequest }) =>
      applicationTypesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationTypeKeys.all });
    },
  });
}

export function useArchiveApplicationType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => applicationTypesApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationTypeKeys.all });
    },
  });
}

export function useApplicationCustomFieldDefinitions(applicationTypeId: string | undefined) {
  return useQuery({
    queryKey: applicationTypeKeys.customFields(applicationTypeId ?? ""),
    queryFn: () => applicationTypesApi.getCustomFields(applicationTypeId!),
    enabled: !!applicationTypeId,
  });
}
