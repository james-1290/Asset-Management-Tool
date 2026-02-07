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

interface CheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetName: string;
  assignedPersonName: string | null;
  onSubmit: (notes: string | null) => void;
  loading?: boolean;
}

export function CheckinDialog({
  open,
  onOpenChange,
  assetName,
  assignedPersonName,
  onSubmit,
  loading,
}: CheckinDialogProps) {
  const [notes, setNotes] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next) {
      setNotes("");
    }
    onOpenChange(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(notes.trim() || null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check In Asset</DialogTitle>
          <DialogDescription>
            Check in <span className="font-medium">{assetName}</span>
            {assignedPersonName && (
              <> from <span className="font-medium">{assignedPersonName}</span></>
            )}
            . The asset will be set to Available.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button type="submit" disabled={loading}>
              {loading ? "Checking in..." : "Check In"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
