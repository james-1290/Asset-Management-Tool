import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarPlaceholder } from "@/components/avatar-placeholder";
import type { AuditLogEntry } from "@/types/audit-log";

interface RecentActivityListProps {
  data: AuditLogEntry[] | undefined;
  isLoading: boolean;
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} mins ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hours ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Date(timestamp).toLocaleDateString();
}

const DOT_COLORS: Record<string, string> = {
  Created: "text-emerald-500",
  Updated: "text-blue-500",
  Archived: "text-zinc-400",
  CheckedOut: "text-amber-500",
  CheckedIn: "text-emerald-500",
};

const ACTION_LABELS: Record<string, string> = {
  Created: "added",
  Updated: "updated",
  Archived: "archived",
  CheckedOut: "assigned",
  CheckedIn: "checked in",
};

function entityLink(entry: AuditLogEntry) {
  const name = entry.entityName ?? entry.entityType;
  if (entry.entityType === "Asset" && entry.entityId) {
    return (
      <Link
        to={`/assets/${entry.entityId}`}
        className="font-semibold text-foreground hover:underline underline-offset-2"
      >
        {name}
      </Link>
    );
  }
  if (entry.entityType === "Certificate" && entry.entityId) {
    return (
      <Link
        to={`/certificates/${entry.entityId}`}
        className="font-semibold text-foreground hover:underline underline-offset-2"
      >
        {name}
      </Link>
    );
  }
  return <span className="font-semibold">{name}</span>;
}

export function RecentActivityList({
  data,
  isLoading,
}: RecentActivityListProps) {
  // Show fewer items with more detail each
  const items = data?.slice(0, 5);

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-foreground">Recent Activity</h3>
          <Link
            to="/audit-log"
            className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            View All
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : !items || items.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No recent activity.
          </p>
        ) : (
          <div className="space-y-5">
            {items.map((entry) => {
              const actionLabel = ACTION_LABELS[entry.action] ?? entry.action.toLowerCase();
              const dotColor = DOT_COLORS[entry.action] ?? "text-gray-400";

              return (
                <div key={entry.id} className="flex gap-3">
                  {/* Avatar */}
                  <div className="shrink-0 mt-0.5">
                    <AvatarPlaceholder name={entry.actorName ?? null} size="lg" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed">
                      <span className="font-semibold">{entry.actorName ?? "System"}</span>
                      {" "}{actionLabel}{" "}
                      {entityLink(entry)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <svg className={`h-3.5 w-3.5 ${dotColor}`} viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="8" r="5" />
                      </svg>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
