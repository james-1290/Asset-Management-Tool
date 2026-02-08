import { Skeleton } from "../ui/skeleton";
import type { PersonHistory } from "../../types/person";

const eventConfig: Record<string, { color: string; label: string }> = {
  Created: { color: "bg-green-500", label: "Created" },
  Edited: { color: "bg-blue-500", label: "Edited" },
  Archived: { color: "bg-red-500", label: "Archived" },
  Restored: { color: "bg-green-500", label: "Restored" },
  AssetAssigned: { color: "bg-indigo-500", label: "Asset Assigned" },
  AssetUnassigned: { color: "bg-yellow-500", label: "Asset Unassigned" },
  AssetCheckedOut: { color: "bg-amber-500", label: "Asset Checked Out" },
  AssetCheckedIn: { color: "bg-teal-500", label: "Asset Checked In" },
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function truncate(value: string, max = 30): string {
  return value.length > max ? value.slice(0, max) + "..." : value;
}

interface PersonHistoryTimelineProps {
  history: PersonHistory[] | undefined;
  isLoading: boolean;
}

export function PersonHistoryTimeline({
  history,
  isLoading,
}: PersonHistoryTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-3 w-3 rounded-full mt-1.5 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No history recorded yet.</p>
    );
  }

  return (
    <div className="relative space-y-0">
      {history.map((entry, index) => {
        const config = eventConfig[entry.eventType] ?? {
          color: "bg-gray-400",
          label: entry.eventType,
        };
        const isLast = index === history.length - 1;

        return (
          <div key={entry.id} className="flex gap-3 relative">
            {!isLast && (
              <div className="absolute left-[5px] top-3 bottom-0 w-px bg-border" />
            )}
            <div
              className={`h-[11px] w-[11px] rounded-full mt-1.5 shrink-0 ${config.color}`}
            />
            <div className="pb-5 min-w-0">
              <p className="text-sm font-medium">{config.label}</p>
              {entry.details && (
                <p className="text-sm text-muted-foreground">{entry.details}</p>
              )}
              {entry.changes && entry.changes.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/70">{change.fieldName}:</span>{" "}
                      {change.oldValue ? truncate(change.oldValue) : "(empty)"}{" "}
                      <span className="text-foreground/50">&rarr;</span>{" "}
                      {change.newValue ? truncate(change.newValue) : "(empty)"}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatTimestamp(entry.timestamp)}
                {entry.performedByUserName &&
                  ` by ${entry.performedByUserName}`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
