import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import type { InventorySnapshotItem } from "@/types/dashboard";

interface InventorySnapshotProps {
  data: InventorySnapshotItem[] | undefined;
  isLoading: boolean;
}

export function InventorySnapshot({ data, isLoading }: InventorySnapshotProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.1)]">
        <h3 className="text-sm font-semibold mb-3">Inventory Snapshot</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-md border bg-muted/30 p-3">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-7 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.1)]">
        <h3 className="text-sm font-semibold mb-3">Inventory Snapshot</h3>
        <p className="text-sm text-muted-foreground">No inventory data available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.1)]">
      <h3 className="text-sm font-semibold mb-3">Inventory Snapshot</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {data.map((item) => (
          <Link
            key={item.label}
            to={item.filterUrl}
            className="block no-underline"
          >
            <div className="rounded-md border bg-muted/30 p-3 transition-all duration-200 hover:shadow-[0_2px_6px_0_rgba(0,0,0,0.12)] hover:bg-muted/50 cursor-pointer">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                {item.label}
              </p>
              <p className="text-xl font-semibold tracking-tight tabular-nums mt-1">
                {item.count}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
