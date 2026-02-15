import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateRange {
  from?: string;
  to?: string;
}

interface Preset {
  label: string;
  value: string;
  getRange: () => DateRange;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildPresets(): Preset[] {
  return [
    {
      label: "Next 30 days",
      value: "next30",
      getRange: () => ({ from: todayISO(), to: addDays(todayISO(), 30) }),
    },
    {
      label: "Next 90 days",
      value: "next90",
      getRange: () => ({ from: todayISO(), to: addDays(todayISO(), 90) }),
    },
    {
      label: "This year",
      value: "thisYear",
      getRange: () => {
        const year = new Date().getFullYear();
        return { from: `${year}-01-01`, to: `${year}-12-31` };
      },
    },
    {
      label: "Next 12 months",
      value: "next12m",
      getRange: () => ({ from: todayISO(), to: addDays(todayISO(), 365) }),
    },
    {
      label: "Custom",
      value: "custom",
      getRange: () => ({ from: todayISO(), to: addDays(todayISO(), 30) }),
    },
  ];
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  defaultPreset?: string;
}

export function DateRangePicker({
  value,
  onChange,
  defaultPreset = "next30",
}: DateRangePickerProps) {
  const presets = buildPresets();
  const [selectedPreset, setSelectedPreset] = useState(defaultPreset);
  const [open, setOpen] = useState(false);

  const activePreset = presets.find((p) => p.value === selectedPreset);
  const displayLabel = activePreset?.value === "custom"
    ? `${value.from ?? "?"} to ${value.to ?? "?"}`
    : activePreset?.label ?? "Select range";

  function handlePresetClick(preset: Preset) {
    setSelectedPreset(preset.value);
    if (preset.value !== "custom") {
      const range = preset.getRange();
      onChange(range);
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarDays className="h-4 w-4" />
          {displayLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Date range</p>
          <div className="flex flex-col gap-1">
            {presets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetClick(preset)}
                className={`text-left text-sm rounded-md px-3 py-1.5 transition-colors ${
                  selectedPreset === preset.value
                    ? "bg-accent text-accent-foreground font-medium"
                    : "hover:bg-accent/50"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {selectedPreset === "custom" && (
            <div className="border-t pt-3 mt-2 space-y-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">From</label>
                <input
                  type="date"
                  className="rounded-md border px-3 py-1.5 text-sm bg-background"
                  value={value.from ?? ""}
                  onChange={(e) =>
                    onChange({ ...value, from: e.target.value || undefined })
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">To</label>
                <input
                  type="date"
                  className="rounded-md border px-3 py-1.5 text-sm bg-background"
                  value={value.to ?? ""}
                  onChange={(e) =>
                    onChange({ ...value, to: e.target.value || undefined })
                  }
                />
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                Apply
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
