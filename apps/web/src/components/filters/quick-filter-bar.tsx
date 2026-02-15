import { cn } from "@/lib/utils";

export interface QuickFilter {
  id: string;
  label: string;
  params: Record<string, string>;
}

interface QuickFilterBarProps {
  filters: QuickFilter[];
  activeFilterId: string | null;
  onApply: (filter: QuickFilter) => void;
  onClear: () => void;
}

export function QuickFilterBar({
  filters,
  activeFilterId,
  onApply,
  onClear,
}: QuickFilterBarProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-muted-foreground mr-1">
        Quick:
      </span>
      {filters.map((f) => {
        const isActive = activeFilterId === f.id;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => (isActive ? onClear() : onApply(f))}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
