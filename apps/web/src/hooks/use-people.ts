import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { createEntityHooks, type EntityInvalidation } from "./create-entity-hooks";
import { peopleApi } from "../lib/api/people";
import type { PersonQueryParams } from "../lib/api/people";
import type {
  Person,
  CreatePersonRequest,
  UpdatePersonRequest,
  OffboardRequest,
} from "../types/person";
import type { CheckPersonDuplicatesRequest } from "../types/duplicate-check";

// assignedPersonName is denormalised onto assets/certificates/applications.
const personInvalidation: EntityInvalidation = {
  root: "people",
  crossEntityOnUpdate: ["assets", "certificates", "applications"],
};

const personHooks = createEntityHooks<Person, CreatePersonRequest, UpdatePersonRequest, PersonQueryParams>(
  personInvalidation,
  peopleApi,
);

export const usePeople = personHooks.useAll;
export const usePagedPeople = personHooks.usePaged;
export const usePerson = personHooks.useDetail;
export const useCreatePerson = personHooks.useCreate;
export const useUpdatePerson = personHooks.useUpdate;
export const useArchivePerson = personHooks.useArchive;
export const useBulkArchivePeople = personHooks.useBulkArchive;

export function usePeopleSearch(query: string) {
  return useQuery({
    queryKey: ["people", "search", query] as const,
    queryFn: () => peopleApi.search(query),
    placeholderData: keepPreviousData,
  });
}

export function usePersonHistory(id: string, limit?: number, enabled: boolean = true) {
  return useQuery({
    queryKey: ["people", id, "history", limit] as const,
    queryFn: () => peopleApi.getHistory(id, limit),
    enabled: enabled && !!id,
  });
}

export function usePersonAssets(id: string) {
  return useQuery({
    queryKey: ["people", id, "assets"] as const,
    queryFn: () => peopleApi.getAssignedAssets(id),
    enabled: !!id,
  });
}

export function usePersonSummary(id: string) {
  return useQuery({
    queryKey: ["people", id, "summary"] as const,
    queryFn: () => peopleApi.getSummary(id),
    enabled: !!id,
  });
}

export function usePersonCertificates(id: string) {
  return useQuery({
    queryKey: ["people", id, "certificates"] as const,
    queryFn: () => peopleApi.getCertificates(id),
    enabled: !!id,
  });
}

export function usePersonApplications(id: string) {
  return useQuery({
    queryKey: ["people", id, "applications"] as const,
    queryFn: () => peopleApi.getApplications(id),
    enabled: !!id,
  });
}

export function useCheckPersonDuplicates() {
  return useMutation({
    mutationFn: (data: CheckPersonDuplicatesRequest) => peopleApi.checkDuplicates(data),
  });
}

export function useOffboardPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: OffboardRequest }) =>
      peopleApi.offboard(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
