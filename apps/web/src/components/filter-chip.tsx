import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
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

// Radix Select forbids an empty-string item value, so the "All" option uses a
// sentinel that maps to/from the "" the callers use.
const ALL = "__all__";

/**
 * A compact "Label: value" filter dropdown used across the list-page toolbars.
 * Built on shadcn `Select` (Radix) so it gets keyboard navigation, typeahead,
 * focus management, and theme-aware menu styling for free — the previous
 * hand-rolled listbox had none of these.
 */
export function FilterChip({
  label,
  value,
  options,
  onChange,
  allLabel = "All",
}: FilterChipProps) {
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-auto gap-1.5 rounded-lg px-4 py-2 font-medium",
          value
            ? "border-primary/30 bg-primary/5 text-foreground"
            : "border-border bg-card text-foreground",
        )}
      >
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
