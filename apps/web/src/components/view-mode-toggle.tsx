import { List, LayoutGrid } from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";

interface ViewModeToggleProps {
  viewMode: "list" | "grouped";
  onViewModeChange: (mode: "list" | "grouped") => void;
}

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center rounded-md border">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 rounded-r-none px-2.5 ${viewMode === "list" ? "bg-muted" : ""}`}
            onClick={() => onViewModeChange("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>List view</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 rounded-l-none px-2.5 ${viewMode === "grouped" ? "bg-muted" : ""}`}
            onClick={() => onViewModeChange("grouped")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Grouped view</TooltipContent>
      </Tooltip>
    </div>
  );
}
