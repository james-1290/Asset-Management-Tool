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
import { PersonCombobox } from "../person-combobox";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetName: string;
  onSubmit: (personId: string, notes: string | null) => void;
  loading?: boolean;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  assetName,
  onSubmit,
  loading,
}: CheckoutDialogProps) {
  const [personId, setPersonId] = useState("");
  const [personName, setPersonName] = useState<string | undefined>();
  const [notes, setNotes] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPersonId("");
      setPersonName(undefined);
      setNotes("");
    }
    onOpenChange(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!personId || personId === "none") return;
    onSubmit(personId, notes.trim() || null);
  }

  const isValid = personId && personId !== "none";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check Out Asset</DialogTitle>
          <DialogDescription>
            Check out <span className="font-medium">{assetName}</span> to a person.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Person *</Label>
            <PersonCombobox
              value={personId}
              displayName={personName}
              onValueChange={(val) => {
                setPersonId(val);
                setPersonName(undefined);
              }}
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
            <Button type="submit" disabled={!isValid || loading}>
              {loading ? "Checking out..." : "Check Out"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
