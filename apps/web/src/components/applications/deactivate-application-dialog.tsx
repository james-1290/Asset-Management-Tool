import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

interface DeactivateApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationName: string;
  onSubmit: (notes: string | null, deactivatedDate: string | null) => void;
  loading?: boolean;
}

export function DeactivateApplicationDialog({
  open,
  onOpenChange,
  applicationName,
  onSubmit,
  loading,
}: DeactivateApplicationDialogProps) {
  const [notes, setNotes] = useState("");
  const [deactivatedDate, setDeactivatedDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  function handleOpenChange(next: boolean) {
    if (!next) {
      setNotes("");
      setDeactivatedDate(new Date().toISOString().split("T")[0]);
    }
    onOpenChange(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(
      notes.trim() || null,
      deactivatedDate ? `${deactivatedDate}T00:00:00Z` : null,
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deactivate Application</DialogTitle>
          <DialogDescription>
            Deactivate <span className="font-medium">{applicationName}</span>.
            The application will be marked as inactive and hidden from default views.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Deactivated Date</Label>
            <Input
              type="date"
              value={deactivatedDate}
              onChange={(e) => setDeactivatedDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
