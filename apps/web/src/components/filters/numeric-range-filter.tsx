import { useState, useRef, useEffect } from "react";
import { PoundSterling, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumericRangeFilterProps {
  label: string;
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  prefix?: string;
}

export function NumericRangeFilter({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  prefix = "£",
}: NumericRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const isActive = !!minValue || !!maxValue;
  const displayText = isActive
    ? minValue && maxValue
      ? `${prefix}${minValue} – ${prefix}${maxValue}`
      : minValue
        ? `> ${prefix}${minValue}`
        : `< ${prefix}${maxValue}`
    : label;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent",
          isActive ? "border-primary/30 bg-primary/5 text-foreground" : "border-border text-muted-foreground"
        )}
      >
        <PoundSterling className="h-3 w-3 shrink-0 opacity-60" />
        <span>{displayText}</span>
        {isActive && (
          <X
            className="ml-0.5 h-3 w-3 shrink-0 opacity-60 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onMinChange("");
              onMaxChange("");
              setOpen(false);
            }}
          />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[240px] rounded-lg border bg-popover p-3 shadow-md">
          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Min ({prefix})</label>
              <input
                type="number"
                value={minValue}
                onChange={(e) => onMinChange(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Max ({prefix})</label>
              <input
                type="number"
                value={maxValue}
                onChange={(e) => onMaxChange(e.target.value)}
                placeholder="Any"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
