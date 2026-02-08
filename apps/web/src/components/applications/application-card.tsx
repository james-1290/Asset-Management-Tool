import { Calendar, Pencil, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { ApplicationStatusBadge } from "./application-status-badge";
import type { Application } from "../../types/application";

const LICENCE_TYPE_LABELS: Record<string, string> = {
  PerSeat: "Per Seat",
  Site: "Site",
  Volume: "Volume",
  OpenSource: "Open Source",
  Trial: "Trial",
  Freeware: "Freeware",
  Subscription: "Subscription",
  Perpetual: "Perpetual",
};

interface ApplicationCardProps {
  application: Application;
  onEdit: (application: Application) => void;
  onArchive: (application: Application) => void;
}

export function ApplicationCard({ application, onEdit, onArchive }: ApplicationCardProps) {
  const expiryFormatted = application.expiryDate
    ? new Date(application.expiryDate).toLocaleDateString()
    : null;

  return (
    <div className="group relative rounded-md border p-3 transition-colors hover:bg-muted/50">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{application.name}</p>
          {application.publisher && (
            <p className="truncate text-xs text-muted-foreground">{application.publisher}</p>
          )}
        </div>
        <ApplicationStatusBadge status={application.status} />
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>{application.applicationTypeName}</p>
        {application.licenceType && (
          <p>{LICENCE_TYPE_LABELS[application.licenceType] ?? application.licenceType}</p>
        )}
        {expiryFormatted && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Expires {expiryFormatted}</span>
          </div>
        )}
      </div>
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onEdit(application)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          onClick={() => onArchive(application)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
