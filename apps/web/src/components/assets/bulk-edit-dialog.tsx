import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { PersonCombobox } from "../person-combobox";
import type { Location } from "../../types/location";
import type { BulkEditAssetsRequest } from "../../types/asset";

const EDITABLE_STATUSES = [
  { value: "Available", label: "Available" },
  { value: "Assigned", label: "Assigned" },
  { value: "InMaintenance", label: "In Maintenance" },
];

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  locations: Location[];
  onSubmit: (request: BulkEditAssetsRequest) => void;
  loading?: boolean;
}

export function BulkEditDialog({
  open,
  onOpenChange,
  selectedIds,
  locations,
  onSubmit,
  loading,
}: BulkEditDialogProps) {
  const [includeStatus, setIncludeStatus] = useState(false);
  const [includeLocation, setIncludeLocation] = useState(false);
  const [includePerson, setIncludePerson] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);

  const [status, setStatus] = useState("");
  const [locationId, setLocationId] = useState("");
  const [assignedPersonId, setAssignedPersonId] = useState("");
  const [notes, setNotes] = useState("");

  const hasAnyField = includeStatus || includeLocation || includePerson || includeNotes;

  function handleSubmit() {
    const request: BulkEditAssetsRequest = {
      ids: selectedIds,
    };

    if (includeStatus && status) {
      request.status = status;
    }

    if (includeLocation && locationId) {
      request.locationId = locationId;
    }

    if (includePerson) {
      if (assignedPersonId && assignedPersonId !== "none") {
        request.assignedPersonId = assignedPersonId;
      } else {
        request.clearAssignedPerson = true;
      }
    }

    if (includeNotes) {
      if (notes.trim()) {
        request.notes = notes.trim();
      } else {
        request.clearNotes = true;
      }
    }

    onSubmit(request);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      // Reset form state on close
      setIncludeStatus(false);
      setIncludeLocation(false);
      setIncludePerson(false);
      setIncludeNotes(false);
      setStatus("");
      setLocationId("");
      setAssignedPersonId("");
      setNotes("");
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Edit Assets</DialogTitle>
          <DialogDescription>
            {selectedIds.length} asset(s) will be updated. Only checked fields will be changed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-status"
                checked={includeStatus}
                onCheckedChange={(v) => setIncludeStatus(v === true)}
              />
              <Label htmlFor="include-status" className="font-medium">Status</Label>
            </div>
            {includeStatus && (
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {EDITABLE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-location"
                checked={includeLocation}
                onCheckedChange={(v) => setIncludeLocation(v === true)}
              />
              <Label htmlFor="include-location" className="font-medium">Location</Label>
            </div>
            {includeLocation && (
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Assigned Person */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-person"
                checked={includePerson}
                onCheckedChange={(v) => setIncludePerson(v === true)}
              />
              <Label htmlFor="include-person" className="font-medium">Assigned Person</Label>
            </div>
            {includePerson && (
              <PersonCombobox
                value={assignedPersonId}
                onValueChange={setAssignedPersonId}
              />
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-notes"
                checked={includeNotes}
                onCheckedChange={(v) => setIncludeNotes(v === true)}
              />
              <Label htmlFor="include-notes" className="font-medium">Notes</Label>
            </div>
            {includeNotes && (
              <Textarea
                placeholder="Enter notes (leave empty to clear)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasAnyField || loading}
          >
            {loading ? "Updating…" : `Update ${selectedIds.length} Asset(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
