import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { WarrantyExpiryItem } from "@/types/dashboard";

interface WarrantyExpiriesListProps {
  data: WarrantyExpiryItem[] | undefined;
  isLoading: boolean;
  days: number;
  onDaysChange: (days: number) => void;
}

const DAY_OPTIONS = [7, 14, 30, 60, 90] as const;

function urgencyBadge(days: number) {
  if (days <= 7)
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-transparent">
        {days}d
      </Badge>
    );
  if (days <= 14)
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-transparent">
        {days}d
      </Badge>
    );
  return (
    <Badge variant="secondary">{days}d</Badge>
  );
}

export function WarrantyExpiriesList({
  data,
  isLoading,
  days,
  onDaysChange,
}: WarrantyExpiriesListProps) {
  return (
    <Card className="h-full flex flex-col relative">
      <div className="absolute top-3 right-10 z-10">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Settings className="h-4 w-4" />
              <span className="sr-only">Timeframe settings</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-2">
            <div className="flex gap-1">
              {DAY_OPTIONS.map((d) => (
                <Button
                  key={d}
                  variant={days === d ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onDaysChange(d)}
                >
                  {d}d
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <CardHeader>
        <CardTitle>Warranty Expiries</CardTitle>
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
            No upcoming warranty expiries.
          </p>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-2">
            {data.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="min-w-0">
                  <Link
                    to={`/assets/${item.id}`}
                    className="font-medium text-sm text-primary hover:underline truncate block"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.assetTypeName}
                  </p>
                </div>
                <div className="ml-2 shrink-0 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.warrantyExpiryDate).toLocaleDateString()}
                  </span>
                  {urgencyBadge(item.daysUntilExpiry)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
