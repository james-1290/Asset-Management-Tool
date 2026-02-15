import { useState, useRef, useEffect } from "react";
import { Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  label: string;
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

export function DateRangeFilter({ label, fromValue, toValue, onFromChange, onToChange }: DateRangeFilterProps) {
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

  const isActive = !!fromValue || !!toValue;
  const displayText = isActive
    ? `${fromValue || "..."} – ${toValue || "..."}`
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
        <Calendar className="h-3 w-3 shrink-0 opacity-60" />
        <span className="max-w-[200px] truncate">{displayText}</span>
        {isActive && (
          <X
            className="ml-0.5 h-3 w-3 shrink-0 opacity-60 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onFromChange("");
              onToChange("");
              setOpen(false);
            }}
          />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[280px] rounded-lg border bg-popover p-3 shadow-md">
          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <input
                type="date"
                value={fromValue}
                onChange={(e) => onFromChange(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <input
                type="date"
                value={toValue}
                onChange={(e) => onToChange(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
