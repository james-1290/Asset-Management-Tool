import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useSearch } from "@/hooks/use-search";

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const navigate = useNavigate();

  const { data } = useSearch(debouncedQuery);

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
    [navigate],
  );

  const hasResults =
    data &&
    (data.assets.length > 0 ||
      data.certificates.length > 0 ||
      data.applications.length > 0 ||
      data.people.length > 0 ||
      data.locations.length > 0);

  return (
    <>
      <Button
        variant="outline"
        className="relative h-8 w-full max-w-md justify-start text-sm text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span>Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </Button>

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
          {data?.assets && data.assets.length > 0 && (
            <CommandGroup heading="Assets">
              {data.assets.map((item) => (
                <CommandItem
                  key={`asset-${item.id}`}
                  value={`asset-${item.name}-${item.id}`}
                  onSelect={() => handleSelect("assets", item.id)}
                >
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {item.subtitle && (
                      <span className="text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data?.certificates && data.certificates.length > 0 && (
            <CommandGroup heading="Certificates">
              {data.certificates.map((item) => (
                <CommandItem
                  key={`cert-${item.id}`}
                  value={`cert-${item.name}-${item.id}`}
                  onSelect={() => handleSelect("certificates", item.id)}
                >
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {item.subtitle && (
                      <span className="text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data?.applications && data.applications.length > 0 && (
            <CommandGroup heading="Applications">
              {data.applications.map((item) => (
                <CommandItem
                  key={`app-${item.id}`}
                  value={`app-${item.name}-${item.id}`}
                  onSelect={() => handleSelect("applications", item.id)}
                >
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {item.subtitle && (
                      <span className="text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data?.people && data.people.length > 0 && (
            <CommandGroup heading="People">
              {data.people.map((item) => (
                <CommandItem
                  key={`person-${item.id}`}
                  value={`person-${item.name}-${item.id}`}
                  onSelect={() => handleSelect("people", item.id)}
                >
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {item.subtitle && (
                      <span className="text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data?.locations && data.locations.length > 0 && (
            <CommandGroup heading="Locations">
              {data.locations.map((item) => (
                <CommandItem
                  key={`location-${item.id}`}
                  value={`location-${item.name}-${item.id}`}
                  onSelect={() => handleSelect("locations", item.id)}
                >
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {item.subtitle && (
                      <span className="text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
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
