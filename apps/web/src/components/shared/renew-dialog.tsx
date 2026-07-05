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
import { toLocalISODate } from "../../lib/format";

function defaultNewExpiry(currentExpiry: string | null): string {
  // Parse a date-only string as a local calendar date (not UTC) so the +1-year
  // suggestion doesn't shift a day in non-UTC timezones.
  let d: Date;
  if (currentExpiry && /^\d{4}-\d{2}-\d{2}$/.test(currentExpiry)) {
    const [y, m, day] = currentExpiry.split("-").map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date();
  }
  d.setFullYear(d.getFullYear() + 1);
  return toLocalISODate(d);
}

interface RenewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityLabel: string;
  entityName: string;
  currentExpiry: string | null;
  onSubmit: (newExpiryDate: string, notes: string | null) => void;
  loading?: boolean;
}

export function RenewDialog({
  open,
  onOpenChange,
  entityLabel,
  entityName,
  currentExpiry,
  onSubmit,
  loading,
}: RenewDialogProps) {
  const [newDate, setNewDate] = useState("");
  const [notes, setNotes] = useState("");
  const [wasOpen, setWasOpen] = useState(false);
  const todayStr = toLocalISODate();

  // Reset the form each time the dialog transitions to open. This is React's
  // "adjust state during render when a prop changes" pattern — no effect needed.
  if (open && !wasOpen) {
    setWasOpen(true);
    setNewDate(defaultNewExpiry(currentExpiry));
    setNotes("");
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const invalid = !newDate || newDate <= todayStr;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid) return;
    onSubmit(newDate, notes.trim() || null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renew {entityLabel}</DialogTitle>
          <DialogDescription>
            Roll the expiry date forward for{" "}
            <span className="font-medium">{entityName}</span>. This resets the
            status to Active and clears any pending expiry alerts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>New expiry date</Label>
            <Input
              type="date"
              min={todayStr}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            {newDate && newDate <= todayStr && (
              <p className="text-xs text-destructive">
                New expiry date must be in the future.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional renewal notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || invalid}>
              {loading ? "Renewing..." : "Renew"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
