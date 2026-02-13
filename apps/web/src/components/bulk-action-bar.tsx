import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  children: ReactNode;
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  children,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
      <span className="text-sm font-medium tabular-nums">
        {selectedCount} selected
      </span>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5">{children}</div>
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-muted-foreground hover:text-foreground"
        onClick={onClearSelection}
      >
        <X className="mr-1 h-3 w-3" />
        Clear
      </Button>
    </div>
  );
}
