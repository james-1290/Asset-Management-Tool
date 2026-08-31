import { Archive } from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";

interface ArchivedToggleProps {
  showArchived: boolean;
  onShowArchivedChange: (show: boolean) => void;
}

/**
 * Reveals archived (soft-deleted) rows so they can be restored.
 *
 * Archiving is a soft delete everywhere in this app, which only means something
 * if the archived record can be found again — otherwise "delete" is permanent
 * in practice and recoverable only from the database.
 */
export function ArchivedToggle({ showArchived, onShowArchivedChange }: ArchivedToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={showArchived ? "secondary" : "outline"}
          size="sm"
          className="h-8 gap-1.5"
          aria-label="Show archived"
          aria-pressed={showArchived}
          onClick={() => onShowArchivedChange(!showArchived)}
        >
          <Archive className="h-3.5 w-3.5" />
          Archived
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {showArchived ? "Hide archived records" : "Show archived records so they can be restored"}
      </TooltipContent>
    </Tooltip>
  );
}
