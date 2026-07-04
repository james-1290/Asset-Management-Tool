import { useState } from "react";
import { toast } from "sonner";
import { Users, X } from "lucide-react";
import { DetailCard, SectionHeader } from "../detail-layout";
import { Button } from "../ui/button";
import { PersonCombobox } from "../person-combobox";
import {
  useApplicationSeats,
  useAssignSeat,
  useReleaseSeat,
} from "../../hooks/use-applications";
import { getApiErrorMessage } from "../../lib/api-client";

interface ApplicationSeatsSectionProps {
  applicationId: string;
  maxSeats: number | null;
  isArchived: boolean;
}

export function ApplicationSeatsSection({
  applicationId,
  maxSeats,
  isArchived,
}: ApplicationSeatsSectionProps) {
  const { data: seats, isLoading } = useApplicationSeats(applicationId);
  const assign = useAssignSeat();
  const release = useReleaseSeat();
  const [personId, setPersonId] = useState("none");

  const used = seats?.length ?? 0;
  const full = maxSeats != null && used >= maxSeats;

  function handleAssign() {
    if (!personId || personId === "none") return;
    assign.mutate(
      { id: applicationId, personId },
      {
        onSuccess: () => {
          toast.success("Seat assigned");
          setPersonId("none");
        },
        onError: (e) => toast.error(getApiErrorMessage(e, "Failed to assign seat")),
      },
    );
  }

  function handleRelease(pid: string, name: string) {
    release.mutate(
      { id: applicationId, personId: pid },
      {
        onSuccess: () => toast.success(`Released ${name}'s seat`),
        onError: (e) => toast.error(getApiErrorMessage(e, "Failed to release seat")),
      },
    );
  }

  return (
    <DetailCard>
      <SectionHeader icon={Users} title="Licence seats" />

      <p className="mb-4 text-sm text-muted-foreground">
        {maxSeats != null
          ? `${used} of ${maxSeats} seat${maxSeats === 1 ? "" : "s"} assigned`
          : `${used} seat${used === 1 ? "" : "s"} assigned (no seat limit set)`}
      </p>

      {!isArchived && (
        <div className="mb-4 flex items-end gap-2">
          <div className="flex-1">
            <PersonCombobox
              value={personId}
              onValueChange={setPersonId}
              disabled={full || assign.isPending}
            />
          </div>
          <Button
            onClick={handleAssign}
            disabled={full || personId === "none" || assign.isPending}
          >
            {assign.isPending ? "Assigning…" : "Assign seat"}
          </Button>
        </div>
      )}
      {full && !isArchived && (
        <p className="mb-4 -mt-2 text-xs text-destructive">
          All seats are in use. Increase the seat count or release a seat first.
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading seats…</p>
      ) : used === 0 ? (
        <p className="text-sm text-muted-foreground">No seats assigned yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {seats!.map((seat) => (
            <li key={seat.id} className="flex items-center justify-between px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{seat.personName}</p>
                {seat.assignedByName && (
                  <p className="truncate text-xs text-muted-foreground">
                    Assigned by {seat.assignedByName}
                  </p>
                )}
              </div>
              {!isArchived && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label={`Release ${seat.personName}'s seat`}
                  disabled={release.isPending}
                  onClick={() => handleRelease(seat.personId, seat.personName)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </DetailCard>
  );
}
