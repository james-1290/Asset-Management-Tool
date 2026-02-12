import { Link } from "react-router-dom";
import { AlertTriangle, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DuplicateCheckResult } from "@/types/duplicate-check";

interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: DuplicateCheckResult[];
  entityType: "assets" | "certificates" | "applications" | "people" | "locations";
  onCreateAnyway: () => void;
  loading?: boolean;
}

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  duplicates,
  entityType,
  onCreateAnyway,
  loading,
}: DuplicateWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Potential duplicates found
          </DialogTitle>
          <DialogDescription>
            We found {duplicates.length} existing record{duplicates.length !== 1 ? "s" : ""} that
            may match what you're creating. Please review before continuing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {duplicates.map((dup) => (
            <div
              key={dup.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{dup.name}</p>
                <p className="text-sm text-muted-foreground truncate">{dup.detail}</p>
              </div>
              <Link
                to={`/${entityType}/${dup.id}`}
                className="ml-2 shrink-0"
                onClick={() => onOpenChange(false)}
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </Link>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onCreateAnyway} disabled={loading}>
            {loading ? "Creating..." : "Create Anyway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
