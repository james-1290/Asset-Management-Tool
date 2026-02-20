import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterChipOption {
  value: string;
  label: string;
}

interface FilterChipProps {
  label: string;
  value: string;
  options: FilterChipOption[];
  onChange: (value: string) => void;
  allLabel?: string;
}

export function FilterChip({
  label,
  value,
  options,
  onChange,
  allLabel = "All",
}: FilterChipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const selectedOption = options.find((o) => o.value === value);
  const displayValue = selectedOption?.label ?? allLabel;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
          "hover:bg-accent",
          value
            ? "border-primary/30 bg-primary/5 text-foreground"
            : "border-border bg-card text-foreground"
        )}
      >
        <span>{label}:</span>
        <span>{displayValue}</span>
        <ChevronDown className="ml-0.5 h-3.5 w-3.5 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border bg-popover p-1 shadow-md">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={cn(
              "w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent",
              !value && "font-medium text-foreground"
            )}
          >
            {allLabel}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                value === opt.value && "font-medium text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
