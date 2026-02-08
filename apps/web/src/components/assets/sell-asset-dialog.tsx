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
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";

interface SellAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetName: string;
  onSubmit: (soldPrice: number | null, soldDate: string | null, notes: string | null) => void;
  loading?: boolean;
}

export function SellAssetDialog({
  open,
  onOpenChange,
  assetName,
  onSubmit,
  loading,
}: SellAssetDialogProps) {
  const [soldPrice, setSoldPrice] = useState("");
  const [soldDate, setSoldDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSoldPrice("");
      setSoldDate(new Date().toISOString().slice(0, 10));
      setNotes("");
    }
    onOpenChange(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = soldPrice ? parseFloat(soldPrice) : null;
    const date = soldDate ? `${soldDate}T00:00:00Z` : null;
    onSubmit(price, date, notes.trim() || null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Sold</DialogTitle>
          <DialogDescription>
            Mark <span className="font-medium">{assetName}</span> as sold. This
            is a terminal state — the asset will be unassigned.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Sold Price</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={soldPrice}
              onChange={(e) => setSoldPrice(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Sold Date</Label>
            <Input
              type="date"
              value={soldDate}
              onChange={(e) => setSoldDate(e.target.value)}
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
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Mark as Sold"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
