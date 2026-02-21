import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  Package,
  Users,
  ShieldCheck,
  AppWindow,
  Trash2,
  Unlink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { useLocations, useReassignAndArchiveLocation } from "../../hooks/use-locations";
import type { Location, LocationItemCounts } from "../../types/location";

type Mode = "reassign" | "unassign";

interface ReassignLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location;
  counts: LocationItemCounts;
  onSuccess: () => void;
}

export function ReassignLocationDialog({
  open,
  onOpenChange,
  location,
  counts,
  onSuccess,
}: ReassignLocationDialogProps) {
  const [mode, setMode] = useState<Mode>("reassign");
  const [targetId, setTargetId] = useState<string>("");
  const { data: allLocations = [] } = useLocations();
  const reassignMutation = useReassignAndArchiveLocation();

  const availableLocations = allLocations.filter(
    (l) => l.id !== location.id && !l.isArchived,
  );

  const canConfirm = mode === "unassign" || (mode === "reassign" && !!targetId);

  function handleConfirm() {
    if (!canConfirm) return;
    reassignMutation.mutate(
      { id: location.id, targetLocationId: mode === "reassign" ? targetId : null },
      {
        onSuccess: () => {
          const msg = mode === "reassign"
            ? `All items reassigned and "${location.name}" deleted`
            : `All items unassigned and "${location.name}" deleted`;
          toast.success(msg);
          setTargetId("");
          setMode("reassign");
          onSuccess();
        },
        onError: () => {
          toast.error("Failed to process items");
        },
      },
    );
  }

  function handleClose() {
    setTargetId("");
    setMode("reassign");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent showCloseButton={false} className="sm:max-w-2xl gap-0 p-0 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold leading-tight">
                Reassign &amp; Delete Location
              </h3>
              <p className="text-muted-foreground">
                Relocate active items from{" "}
                <span className="font-semibold text-foreground">{location.name}</span>{" "}
                before deletion.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8">
          {/* Impact Summary Cards */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Items impacted by this action
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {counts.assets > 0 && (
                <div className="bg-muted/50 p-4 rounded-xl border text-center">
                  <Package className="h-5 w-5 text-primary/70 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{counts.assets}</div>
                  <div className="text-xs font-medium text-muted-foreground uppercase">Assets</div>
                </div>
              )}
              {counts.people > 0 && (
                <div className="bg-muted/50 p-4 rounded-xl border text-center">
                  <Users className="h-5 w-5 text-primary/70 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{counts.people}</div>
                  <div className="text-xs font-medium text-muted-foreground uppercase">People</div>
                </div>
              )}
              {counts.certificates > 0 && (
                <div className="bg-muted/50 p-4 rounded-xl border text-center">
                  <ShieldCheck className="h-5 w-5 text-primary/70 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{counts.certificates}</div>
                  <div className="text-xs font-medium text-muted-foreground uppercase">Certs</div>
                </div>
              )}
              {counts.applications > 0 && (
                <div className="bg-muted/50 p-4 rounded-xl border text-center">
                  <AppWindow className="h-5 w-5 text-primary/70 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{counts.applications}</div>
                  <div className="text-xs font-medium text-muted-foreground uppercase">Apps</div>
                </div>
              )}
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              What should happen to these items?
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("reassign")}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  mode === "reassign"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <ArrowRightLeft className={`h-5 w-5 shrink-0 ${mode === "reassign" ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <div className={`text-sm font-semibold ${mode === "reassign" ? "text-primary" : ""}`}>
                    Move to another location
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Reassign all items to a different location
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setMode("unassign"); setTargetId(""); }}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  mode === "unassign"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <Unlink className={`h-5 w-5 shrink-0 ${mode === "unassign" ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <div className={`text-sm font-semibold ${mode === "unassign" ? "text-primary" : ""}`}>
                    Unassign all items
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Remove location from all items
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Reassignment Selector — only shown when mode is "reassign" */}
          {mode === "reassign" && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold">
                Move all items to...
              </label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger className="w-full h-12 text-sm font-medium">
                  <SelectValue placeholder="Select destination location" />
                </SelectTrigger>
                <SelectContent>
                  {availableLocations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-muted/30 flex items-center justify-end gap-3 border-t border-border">
          <Button
            variant="ghost"
            className="px-6 font-semibold"
            onClick={handleClose}
            disabled={reassignMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            className="px-6 font-bold"
            onClick={handleConfirm}
            disabled={!canConfirm || reassignMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {reassignMutation.isPending
              ? "Processing..."
              : mode === "reassign"
                ? "Reassign & Delete"
                : "Unassign & Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
