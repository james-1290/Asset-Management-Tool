import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createEntityHooks, entityWriteInvalidations, type EntityInvalidation } from "./create-entity-hooks";
import { applicationsApi } from "../lib/api/applications";
import type { ApplicationQueryParams } from "../lib/api/applications";
import type {
  Application,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  DeactivateApplicationRequest,
  ReactivateApplicationRequest,
} from "../types/application";
import type { CheckApplicationDuplicatesRequest } from "../types/duplicate-check";

const applicationInvalidation: EntityInvalidation = { root: "applications", historyOnUpdate: true };

const applicationHooks = createEntityHooks<
  Application,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  ApplicationQueryParams
>(applicationInvalidation, applicationsApi);

export const usePagedApplications = applicationHooks.usePaged;
export const useApplication = applicationHooks.useDetail;
export const useCreateApplication = applicationHooks.useCreate;
export const useUpdateApplication = applicationHooks.useUpdate;
export const useArchiveApplication = applicationHooks.useArchive;
export const useBulkArchiveApplications = applicationHooks.useBulkArchive;

// Single-application actions invalidate the same keys as an update.
function useApplicationAction<TData>(action: (vars: { id: string; data: TData }) => Promise<Application>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (_data, variables) => {
      for (const queryKey of entityWriteInvalidations(applicationInvalidation, "update", variables.id)) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

export function useApplicationHistory(id: string, limit?: number) {
  return useQuery({
    queryKey: ["applications", id, "history", limit] as const,
    queryFn: () => applicationsApi.getHistory(id, limit),
    enabled: !!id,
  });
}

export function useDeactivateApplication() {
  return useApplicationAction<DeactivateApplicationRequest>(({ id, data }) =>
    applicationsApi.deactivate(id, data),
  );
}

export function useReactivateApplication() {
  return useApplicationAction<ReactivateApplicationRequest>(({ id, data }) =>
    applicationsApi.reactivate(id, data),
  );
}

export function useRenewApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { newExpiryDate: string; notes?: string } }) =>
      applicationsApi.renew(id, data),
    onSuccess: (_data, variables) => {
      for (const queryKey of entityWriteInvalidations(applicationInvalidation, "update", variables.id)) {
        queryClient.invalidateQueries({ queryKey });
      }
      // Renewal clears any pending expiry alerts.
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });
}

export function useApplicationSeats(id: string) {
  return useQuery({
    queryKey: ["applications", id, "seats"],
    queryFn: () => applicationsApi.getSeats(id),
    enabled: !!id,
  });
}

function useSeatMutation<TVars extends { id: string }>(action: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["applications", variables.id, "seats"] });
      queryClient.invalidateQueries({ queryKey: ["applications", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

export function useAssignSeat() {
  return useSeatMutation(({ id, personId, notes }: { id: string; personId: string; notes?: string }) =>
    applicationsApi.assignSeat(id, { personId, notes }),
  );
}

export function useReleaseSeat() {
  return useSeatMutation(({ id, personId }: { id: string; personId: string }) =>
    applicationsApi.releaseSeat(id, personId),
  );
}

export function useCheckApplicationDuplicates() {
  return useMutation({
    mutationFn: (data: CheckApplicationDuplicatesRequest) => applicationsApi.checkDuplicates(data),
  });
}

export function useBulkStatusApplications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      applicationsApi.bulkStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
