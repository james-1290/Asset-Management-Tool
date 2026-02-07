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
    <Card>
      <CardHeader>
        <CardTitle>Checked Out Assets</CardTitle>
      </CardHeader>
      <CardContent>
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
          <div className="max-h-[280px] overflow-y-auto space-y-2">
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
                  <p className="text-xs text-muted-foreground truncate">
                    {asset.assetTag}
                    {asset.assignedPersonName &&
                      ` \u00B7 ${asset.assignedPersonName}`}
                  </p>
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
