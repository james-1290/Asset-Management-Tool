import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditLogEntry } from "@/types/audit-log";

interface RecentActivityListProps {
  data: AuditLogEntry[] | undefined;
  isLoading: boolean;
}

const actionBadgeClasses: Record<string, string> = {
  Created: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Updated: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Archived: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  CheckedOut: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  CheckedIn: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export function RecentActivityList({
  data,
  isLoading,
}: RecentActivityListProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            No recent activity.
          </p>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-2">
            {data.map((entry) => {
              const colorClass = actionBadgeClasses[entry.action];
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <div className="shrink-0 pt-0.5">
                    {colorClass ? (
                      <Badge className={`${colorClass} border-transparent text-xs`}>
                        {entry.action}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        {entry.action}
                      </Badge>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">
                      {entry.entityType === "Asset" && entry.entityId ? (
                        <Link
                          to={`/assets/${entry.entityId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {entry.entityName ?? entry.entityType}
                        </Link>
                      ) : (
                        <span className="font-medium">
                          {entry.entityName ?? entry.entityType}
                        </span>
                      )}
                    </p>
                    {entry.details && (
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.details}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(entry.timestamp).toLocaleDateString()}
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
