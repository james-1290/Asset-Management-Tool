import { Rows3, Rows4 } from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
import type { Density } from "@/hooks/use-density";

interface DensityToggleProps {
  density: Density;
  onDensityChange: (density: Density) => void;
}

/**
 * Row height for the table. Built to the same shape as ViewModeToggle so the
 * two read as one control group when they sit side by side.
 */
export function DensityToggle({ density, onDensityChange }: DensityToggleProps) {
  return (
    <div className="flex items-center rounded-md border">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 rounded-r-none px-2.5 ${density === "comfortable" ? "bg-muted" : ""}`}
            aria-label="Comfortable rows"
            aria-pressed={density === "comfortable"}
            onClick={() => onDensityChange("comfortable")}
          >
            <Rows3 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Comfortable rows</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 rounded-l-none px-2.5 ${density === "compact" ? "bg-muted" : ""}`}
            aria-label="Compact rows"
            aria-pressed={density === "compact"}
            onClick={() => onDensityChange("compact")}
          >
            <Rows4 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Compact rows</TooltipContent>
      </Tooltip>
    </div>
  );
}
