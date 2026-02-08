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

interface RetireAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetName: string;
  onSubmit: (notes: string | null) => void;
  loading?: boolean;
}

export function RetireAssetDialog({
  open,
  onOpenChange,
  assetName,
  onSubmit,
  loading,
}: RetireAssetDialogProps) {
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
          <DialogTitle>Retire Asset</DialogTitle>
          <DialogDescription>
            Retire <span className="font-medium">{assetName}</span>. This is a
            terminal state — the asset will be unassigned and marked as retired.
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
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? "Retiring..." : "Retire"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
