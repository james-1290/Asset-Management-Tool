import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

const actionBadgeClasses: Record<string, string> = {
  Created: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Updated: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Archived: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  CheckedOut: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  CheckedIn: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export function RecentActivityList({
  data,
  isLoading,
}: RecentActivityListProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          <Link
            to="/audit-log"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            No recent activity.
          </p>
        ) : (
          <div className="overflow-y-auto flex-1">
            {data.map((entry, index) => {
              const colorClass = actionBadgeClasses[entry.action];
              return (
                <div
                  key={entry.id}
                  className={[
                    "flex items-center gap-3 py-2.5 px-0.5",
                    index !== data.length - 1 ? "border-b border-border/60" : "",
                  ].join(" ")}
                >
                  <div className="shrink-0">
                    {colorClass ? (
                      <Badge className={`${colorClass} border-transparent text-[10px] font-medium px-1.5 py-0`}>
                        {entry.action}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0">
                        {entry.action}
                      </Badge>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">
                      {entry.entityType === "Asset" && entry.entityId ? (
                        <Link
                          to={`/assets/${entry.entityId}`}
                          className="font-medium text-foreground hover:underline underline-offset-2"
                        >
                          {entry.entityName ?? entry.entityType}
                        </Link>
                      ) : (
                        <span className="font-medium">
                          {entry.entityName ?? entry.entityType}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                    {formatRelativeTime(entry.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
