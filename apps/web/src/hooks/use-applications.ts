import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { applicationsApi } from "../lib/api/applications";
import type { ApplicationQueryParams } from "../lib/api/applications";
import type {
  CreateApplicationRequest,
  UpdateApplicationRequest,
  DeactivateApplicationRequest,
  ReactivateApplicationRequest,
} from "../types/application";

const applicationKeys = {
  all: ["applications"] as const,
  paged: (params: ApplicationQueryParams) => ["applications", "paged", params] as const,
  detail: (id: string) => ["applications", id] as const,
  history: (id: string, limit?: number) => ["applications", id, "history", limit] as const,
};

export function useApplications() {
  return useQuery({
    queryKey: applicationKeys.all,
    queryFn: applicationsApi.getAll,
  });
}

export function usePagedApplications(params: ApplicationQueryParams) {
  return useQuery({
    queryKey: applicationKeys.paged(params),
    queryFn: () => applicationsApi.getPaged(params),
    placeholderData: keepPreviousData,
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => applicationsApi.getById(id),
    enabled: !!id,
  });
}

export function useApplicationHistory(id: string, limit?: number) {
  return useQuery({
    queryKey: applicationKeys.history(id, limit),
    queryFn: () => applicationsApi.getHistory(id, limit),
    enabled: !!id,
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApplicationRequest) => applicationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApplicationRequest }) =>
      applicationsApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["applications", variables.id, "history"] });
    },
  });
}

export function useDeactivateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DeactivateApplicationRequest }) =>
      applicationsApi.deactivate(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["applications", variables.id, "history"] });
    },
  });
}

export function useReactivateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReactivateApplicationRequest }) =>
      applicationsApi.reactivate(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["applications", variables.id, "history"] });
    },
  });
}

export function useArchiveApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => applicationsApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}

export function useBulkArchiveApplications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => applicationsApi.bulkArchive(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}

export function useBulkStatusApplications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      applicationsApi.bulkStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}
