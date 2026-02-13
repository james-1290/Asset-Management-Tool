import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CheckedOutAsset } from "@/types/dashboard";

interface CheckedOutListProps {
  data: CheckedOutAsset[] | undefined;
  isLoading: boolean;
}

export function CheckedOutList({ data, isLoading }: CheckedOutListProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Checked Out Assets</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            No checked out assets.
          </p>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-2">
            {data.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="min-w-0">
                  <Link
                    to={`/assets/${asset.id}`}
                    className="font-medium text-sm text-primary hover:underline truncate block"
                  >
                    {asset.name}
                  </Link>
                  {asset.assignedPersonName && (
                    <p className="text-xs text-muted-foreground truncate">
                      {asset.assignedPersonName}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {new Date(asset.updatedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
