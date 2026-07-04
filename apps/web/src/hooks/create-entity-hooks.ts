import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type QueryClient,
} from "@tanstack/react-query";
import type { PagedResponse } from "../types/paged-response";

/**
 * Declarative cross-entity cache invalidation config for an entity's writes.
 *
 * Every create/update/archive invalidates `[root]` plus `related` (default
 * `[["dashboard"]]`). An update additionally invalidates the detail key
 * `[root, id]`, optionally the history list, and any `crossEntityOnUpdate`
 * roots (entities that embed this one's denormalised name, e.g. a location
 * rename refreshes assets/certificates/applications/people).
 */
export interface EntityInvalidation {
  root: string;
  related?: readonly (readonly unknown[])[];
  historyOnUpdate?: boolean;
  crossEntityOnUpdate?: readonly string[];
}

/**
 * The exact set of query keys a given write invalidates. Pure and dependency-free
 * so it can be unit-tested (the hooks just invalidate each key it returns).
 */
export function entityWriteInvalidations(
  cfg: EntityInvalidation,
  kind: "create" | "update" | "archive",
  id?: string,
): (readonly unknown[])[] {
  const related = cfg.related ?? [["dashboard"]];
  const keys: (readonly unknown[])[] = [[cfg.root]];
  if (kind === "update" && id) {
    keys.push([cfg.root, id]);
    if (cfg.historyOnUpdate) keys.push([cfg.root, id, "history"]);
    for (const r of cfg.crossEntityOnUpdate ?? []) keys.push([r]);
  }
  keys.push(...related);
  return keys;
}

function runInvalidations(
  queryClient: QueryClient,
  cfg: EntityInvalidation,
  kind: "create" | "update" | "archive",
  id?: string,
): void {
  for (const queryKey of entityWriteInvalidations(cfg, kind, id)) {
    queryClient.invalidateQueries({ queryKey });
  }
}

export interface BulkArchiveResult {
  succeeded: number;
  failed: number;
}

interface EntityApiLike<T, TCreate, TUpdate, TParams> {
  getAll: () => Promise<T[]>;
  getPaged: (params: TParams) => Promise<PagedResponse<T>>;
  getById: (id: string) => Promise<T>;
  create: (data: TCreate) => Promise<T>;
  update: (id: string, data: TUpdate) => Promise<T>;
  archive: (id: string) => Promise<void>;
  bulkArchive?: (ids: string[]) => Promise<BulkArchiveResult>;
}

/**
 * Generate the CRUD React Query hooks shared by the entity modules. Re-export
 * the returned functions under the module's public names, e.g.
 *
 *   const hooks = createEntityHooks<Asset, ...>({ root: "assets", historyOnUpdate: true }, assetsApi);
 *   export const usePagedAssets = hooks.usePaged;
 *   export const useCreateAsset = hooks.useCreate;
 *
 * Entity-specific queries/mutations (history, checkout, renew, seats, …) stay
 * hand-written in each module.
 */
export function createEntityHooks<T, TCreate, TUpdate, TParams>(
  cfg: EntityInvalidation,
  api: EntityApiLike<T, TCreate, TUpdate, TParams>,
) {
  const keys = {
    all: [cfg.root] as const,
    paged: (params: TParams) => [cfg.root, "paged", params] as const,
    detail: (id: string) => [cfg.root, id] as const,
  };

  function useAll() {
    return useQuery({ queryKey: keys.all, queryFn: api.getAll });
  }

  function usePaged(params: TParams) {
    return useQuery({
      queryKey: keys.paged(params),
      queryFn: () => api.getPaged(params),
      placeholderData: keepPreviousData,
    });
  }

  function useDetail(id: string) {
    return useQuery({
      queryKey: keys.detail(id),
      queryFn: () => api.getById(id),
      enabled: !!id,
    });
  }

  function useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (data: TCreate) => api.create(data),
      onSuccess: () => runInvalidations(queryClient, cfg, "create"),
    });
  }

  function useUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: TUpdate }) =>
        api.update(id, data),
      onSuccess: (_data, variables) =>
        runInvalidations(queryClient, cfg, "update", variables.id),
    });
  }

  function useArchive() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => api.archive(id),
      onSuccess: () => runInvalidations(queryClient, cfg, "archive"),
    });
  }

  function useBulkArchive() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (ids: string[]) => api.bulkArchive!(ids),
      onSuccess: () => runInvalidations(queryClient, cfg, "archive"),
    });
  }

  return { keys, useAll, usePaged, useDetail, useCreate, useUpdate, useArchive, useBulkArchive };
}
