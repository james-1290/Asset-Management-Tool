import { useCallback, useEffect, useRef, useState } from "react";
import type { VisibilityState } from "@tanstack/react-table";
import type { SetURLSearchParams } from "react-router-dom";
import { useSavedViews } from "./use-saved-views";
import type { SavedView, ViewConfiguration } from "../types/saved-view";

interface UseSavedViewStateOptions {
  /** The entity type saved views are stored under, e.g. "assets". */
  entityType: string;
  /** Filter params this list owns, restored and cleared with a view. */
  filterKeys: readonly string[];
  /** Sort to fall back to when a view is cleared. */
  defaultSortBy: string;
  defaultSortDir?: "asc" | "desc";
  /** Column visibility to fall back to; `{}` means "all visible". */
  defaultColumnVisibility?: VisibilityState;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  /** The list's search box, kept in step with the view's search term. */
  setSearchInput: (value: string) => void;
  columnVisibility: VisibilityState;
  setColumnVisibility: (visibility: VisibilityState) => void;
  /** Current page size, stored with the view. */
  pageSize: number;
}

/**
 * The saved-view plumbing every list page shares: applying a view to the URL,
 * capturing the current state as a view, resetting to defaults, and applying
 * the user's default view on first load.
 *
 * Each page had its own copy of this — about 550 lines between them, differing
 * only in the entity type and which filter params it owns. Five near-identical
 * copies is how the behaviour drifts apart: one page silently applied a default
 * view while offering no control to manage views, and another had no saved
 * views at all.
 *
 * The page keeps ownership of its own filter params; this only owns the
 * mechanical part that is identical everywhere.
 */
export function useSavedViewState({
  entityType,
  filterKeys,
  defaultSortBy,
  defaultSortDir = "asc",
  defaultColumnVisibility,
  searchParams,
  setSearchParams,
  setSearchInput,
  columnVisibility,
  setColumnVisibility,
  pageSize,
}: UseSavedViewStateOptions) {
  const { data: savedViews = [] } = useSavedViews(entityType);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const defaultViewApplied = useRef(false);

  const applyView = useCallback(
    (view: SavedView) => {
      try {
        const config: ViewConfiguration = JSON.parse(view.configuration);
        setActiveViewId(view.id);
        setColumnVisibility({ ...(defaultColumnVisibility ?? {}), ...config.columnVisibility });
        setSearchParams((prev) => {
          if (config.sortBy) prev.set("sortBy", config.sortBy);
          if (config.sortDir) prev.set("sortDir", config.sortDir);

          if (config.search) {
            prev.set("search", config.search);
            setSearchInput(config.search);
          } else {
            prev.delete("search");
            setSearchInput("");
          }

          for (const [key, value] of [
            ["status", config.status],
            ["typeId", config.typeId],
          ] as const) {
            if (value) prev.set(key, value);
            else prev.delete(key);
          }

          if (config.viewMode && config.viewMode !== "list") prev.set("viewMode", config.viewMode);
          else prev.delete("viewMode");

          if (config.pageSize) prev.set("pageSize", String(config.pageSize));

          for (const key of filterKeys) {
            const value = config.filters?.[key];
            if (value) prev.set(key, String(value));
            else prev.delete(key);
          }

          prev.set("page", "1");
          return prev;
        });
      } catch {
        // A view whose configuration will not parse is ignored rather than
        // left half-applied.
      }
    },
    [setSearchParams, setSearchInput, setColumnVisibility, defaultColumnVisibility, filterKeys],
  );

  // Apply the user's default view the first time the list is opened.
  //
  // This is state arriving from an external system: the views are fetched from
  // the server, so the default cannot be known at first render and has to be
  // applied once it lands. The ref makes it happen exactly once per mount.
  useEffect(() => {
    if (defaultViewApplied.current || savedViews.length === 0) return;
    defaultViewApplied.current = true;
    const defaultView = savedViews.find((v) => v.isDefault);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (defaultView) applyView(defaultView);
  }, [savedViews, applyView]);

  const handleResetToDefault = useCallback(() => {
    setColumnVisibility(defaultColumnVisibility ?? {});
    setActiveViewId(null);
    setSearchParams((prev) => {
      for (const key of ["search", "status", "typeId", "viewMode", ...filterKeys]) {
        prev.delete(key);
      }
      prev.set("sortBy", defaultSortBy);
      prev.set("sortDir", defaultSortDir);
      prev.set("page", "1");
      return prev;
    });
    setSearchInput("");
  }, [
    setSearchParams, setSearchInput, setColumnVisibility,
    defaultColumnVisibility, filterKeys, defaultSortBy, defaultSortDir,
  ]);

  const getCurrentConfiguration = useCallback((): ViewConfiguration => {
    const filters: Record<string, string> = {};
    for (const key of filterKeys) {
      const value = searchParams.get(key);
      if (value) filters[key] = value;
    }
    const viewMode = searchParams.get("viewMode");
    return {
      columnVisibility,
      sortBy: searchParams.get("sortBy") ?? defaultSortBy,
      sortDir: searchParams.get("sortDir") ?? defaultSortDir,
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      typeId: searchParams.get("typeId") || undefined,
      viewMode: viewMode && viewMode !== "list" ? (viewMode as "grouped") : undefined,
      pageSize,
      filters,
    };
  }, [searchParams, columnVisibility, filterKeys, defaultSortBy, defaultSortDir, pageSize]);

  return { savedViews, activeViewId, applyView, handleResetToDefault, getCurrentConfiguration };
}
