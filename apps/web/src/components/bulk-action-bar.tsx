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
    <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2">
      <span className="text-sm font-medium">
        {selectedCount} selected
      </span>
      <div className="flex items-center gap-2">{children}</div>
      <Button variant="ghost" size="sm" onClick={onClearSelection}>
        <X className="mr-1 h-3 w-3" />
        Clear
      </Button>
    </div>
  );
}
