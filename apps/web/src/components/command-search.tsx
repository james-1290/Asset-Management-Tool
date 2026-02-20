import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useSearch } from "@/hooks/use-search";

const RECENT_SEARCHES_KEY = "recent-searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function addRecentSearch(term: string) {
  const trimmed = term.trim();
  if (trimmed.length < 2) return;
  const existing = getRecentSearches().filter((s) => s !== trimmed);
  const updated = [trimmed, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const navigate = useNavigate();

  const { data } = useSearch(debouncedQuery);

  // Derive recent searches when dialog opens (avoids setState in effect)
  const recentSearches = useMemo(() => (open ? getRecentSearches() : []), [open]);

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Cmd+K listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSelect = useCallback(
    (type: string, id: string) => {
      if (debouncedQuery.length >= 2) {
        addRecentSearch(debouncedQuery);
      }
      setOpen(false);
      setQuery("");
      setDebouncedQuery("");
      switch (type) {
        case "assets":
          navigate(`/assets/${id}`);
          break;
        case "certificates":
          navigate(`/certificates/${id}`);
          break;
        case "applications":
          navigate(`/applications/${id}`);
          break;
        case "people":
          navigate(`/people/${id}`);
          break;
        case "locations":
          navigate("/locations");
          break;
      }
    },
    [navigate, debouncedQuery],
  );

  const handleRecentSelect = useCallback(
    (term: string) => {
      setQuery(term);
      setDebouncedQuery(term);
    },
    [],
  );

  const hasResults = useMemo(
    () =>
      data &&
      (data.assets.length > 0 ||
        data.certificates.length > 0 ||
        data.applications.length > 0 ||
        data.people.length > 0 ||
        data.locations.length > 0),
    [data],
  );

  const showRecent = query.length === 0 && recentSearches.length > 0;

  function groupHeading(label: string, count?: number) {
    if (count != null && count > 0) return `${label} (${count})`;
    return label;
  }

  return (
    <>
      <div className="relative w-full group" onClick={() => setOpen(true)}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <div className="w-full bg-muted/50 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-muted-foreground cursor-pointer hover:bg-muted transition-all">
          Search assets, serial numbers, or users...
        </div>
      </div>

      <CommandDialog
        open={open}
        onOpenChange={(val) => {
          setOpen(val);
          if (!val) {
            setQuery("");
            setDebouncedQuery("");
          }
        }}
        title="Search"
        description="Search across all entities"
      >
        <CommandInput
          placeholder="Search assets, certificates, people..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {debouncedQuery.length >= 2 && !hasResults && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {showRecent && (
            <CommandGroup heading="Recent Searches">
              {recentSearches.map((term) => (
                <CommandItem
                  key={`recent-${term}`}
                  value={`recent-${term}`}
                  onSelect={() => handleRecentSelect(term)}
                >
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{term}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {showRecent && hasResults && <CommandSeparator />}

          {data?.assets && data.assets.length > 0 && (
            <CommandGroup heading={groupHeading("Assets", data.counts?.assets)}>
              {data.assets.map((item) => (
                <CommandItem
                  key={`asset-${item.id}`}
                  value={`asset-${item.name}-${item.id}`}
                  onSelect={() => handleSelect("assets", item.id)}
                >
                  <div className="flex flex-1 items-center justify-between min-w-0">
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{item.name}</span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                    {item.extra && (
                      <Badge variant="secondary" className="ml-2 shrink-0 text-xs font-normal">
                        {item.extra}
                      </Badge>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data?.certificates && data.certificates.length > 0 && (
            <CommandGroup heading={groupHeading("Certificates", data.counts?.certificates)}>
              {data.certificates.map((item) => (
                <CommandItem
                  key={`cert-${item.id}`}
                  value={`cert-${item.name}-${item.id}`}
                  onSelect={() => handleSelect("certificates", item.id)}
                >
                  <div className="flex flex-1 items-center justify-between min-w-0">
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{item.name}</span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                    {item.extra && (
                      <Badge
                        variant={item.extra.startsWith("Expires") || item.extra === "Expired" ? "destructive" : "secondary"}
                        className="ml-2 shrink-0 text-xs font-normal"
                      >
                        {item.extra}
                      </Badge>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data?.applications && data.applications.length > 0 && (
            <CommandGroup heading={groupHeading("Applications", data.counts?.applications)}>
              {data.applications.map((item) => (
                <CommandItem
                  key={`app-${item.id}`}
                  value={`app-${item.name}-${item.id}`}
                  onSelect={() => handleSelect("applications", item.id)}
                >
                  <div className="flex flex-1 items-center justify-between min-w-0">
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{item.name}</span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                    {item.extra && (
                      <Badge variant="secondary" className="ml-2 shrink-0 text-xs font-normal">
                        {item.extra}
                      </Badge>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data?.people && data.people.length > 0 && (
            <CommandGroup heading={groupHeading("People", data.counts?.people)}>
              {data.people.map((item) => (
                <CommandItem
                  key={`person-${item.id}`}
                  value={`person-${item.name}-${item.id}`}
                  onSelect={() => handleSelect("people", item.id)}
                >
                  <div className="flex flex-1 items-center justify-between min-w-0">
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{item.name}</span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                    {item.extra && (
                      <Badge variant="secondary" className="ml-2 shrink-0 text-xs font-normal">
                        {item.extra}
                      </Badge>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data?.locations && data.locations.length > 0 && (
            <CommandGroup heading={groupHeading("Locations", data.counts?.locations)}>
              {data.locations.map((item) => (
                <CommandItem
                  key={`location-${item.id}`}
                  value={`location-${item.name}-${item.id}`}
                  onSelect={() => handleSelect("locations", item.id)}
                >
                  <div className="flex flex-1 items-center justify-between min-w-0">
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{item.name}</span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                    {item.extra && (
                      <Badge variant="secondary" className="ml-2 shrink-0 text-xs font-normal">
                        {item.extra}
                      </Badge>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
