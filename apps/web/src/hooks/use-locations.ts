import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createEntityHooks, type EntityInvalidation } from "./create-entity-hooks";
import { locationsApi } from "../lib/api/locations";
import type { LocationQueryParams } from "../lib/api/locations";
import type {
  Location,
  CreateLocationRequest,
  UpdateLocationRequest,
} from "../types/location";
import type { CheckLocationDuplicatesRequest } from "../types/duplicate-check";

// A location rename must refresh entities that embed its denormalised name.
const locationInvalidation: EntityInvalidation = {
  root: "locations",
  crossEntityOnUpdate: ["assets", "certificates", "applications", "people"],
};

const locationHooks = createEntityHooks<Location, CreateLocationRequest, UpdateLocationRequest, LocationQueryParams>(
  locationInvalidation,
  locationsApi,
);

export const useLocations = locationHooks.useAll;
export const usePagedLocations = locationHooks.usePaged;
export const useLocation = locationHooks.useDetail;
export const useCreateLocation = locationHooks.useCreate;
export const useUpdateLocation = locationHooks.useUpdate;
export const useArchiveLocation = locationHooks.useArchive;

export function useLocationAssets(id: string) {
  return useQuery({
    queryKey: ["locations", id, "assets"] as const,
    queryFn: () => locationsApi.getAssets(id),
    enabled: !!id,
  });
}

export function useLocationPeople(id: string) {
  return useQuery({
    queryKey: ["locations", id, "people"] as const,
    queryFn: () => locationsApi.getPeople(id),
    enabled: !!id,
  });
}

export function useCheckLocationDuplicates() {
  return useMutation({
    mutationFn: (data: CheckLocationDuplicatesRequest) => locationsApi.checkDuplicates(data),
  });
}

export function useReassignAndArchiveLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, targetLocationId }: { id: string; targetLocationId: string | null }) =>
      locationsApi.reassignAndArchive(id, { targetLocationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["people"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
