import { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { useAssetLifecycleReport } from "@/hooks/use-reports";
import { reportsApi } from "@/lib/api/reports";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangePicker, type DateRange } from "./date-range-picker";

export function AssetLifecycleReport() {
  const year = new Date().getFullYear();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  });
  const { data, isLoading, dataUpdatedAt } = useAssetLifecycleReport(dateRange.from, dateRange.to);

  async function handleExport() {
    try {
      await reportsApi.downloadAssetLifecycleCsv(dateRange.from, dateRange.to);
      toast.success("CSV exported");
    } catch {
      toast.error("Export failed");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            defaultPreset="thisYear"
          />
          {dataUpdatedAt > 0 && (
            <p className="text-xs text-muted-foreground">
              Generated: {new Date(dataUpdatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
          <Button size="sm" onClick={handleExport} className="no-print">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Age buckets */}
      <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b">
          <h3 className="font-bold">Assets by Age</h3>
          <p className="text-sm text-muted-foreground">Distribution of assets by purchase age</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.byAge.map((bucket) => (
              <div
                key={bucket.bucket}
                className="text-center rounded-lg border p-4"
              >
                <p className="text-2xl font-bold">{bucket.count}</p>
                <p className="text-sm text-muted-foreground">{bucket.bucket}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Oldest assets */}
      <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b">
          <h3 className="font-bold">Oldest Assets (top 20)</h3>
          <p className="text-sm text-muted-foreground">Assets with the oldest purchase dates</p>
        </div>
        {data.oldestAssets.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-muted-foreground text-center">
              No assets with purchase dates in the selected range.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Purchase Date</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Age (days)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.oldestAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>{asset.assetTypeName}</TableCell>
                  <TableCell>
                    {new Date(asset.purchaseDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">{asset.ageDays}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Past warranty */}
      <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b">
          <h3 className="font-bold">Past Warranty ({data.pastWarranty.length})</h3>
          <p className="text-sm text-muted-foreground">Assets with expired warranties</p>
        </div>
        {data.pastWarranty.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-muted-foreground text-center">
              No assets past warranty in the selected range.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Warranty Expired</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Days Overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.pastWarranty.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>{asset.assetTypeName}</TableCell>
                  <TableCell>
                    {new Date(asset.warrantyExpiryDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right text-destructive font-medium">
                    {Math.abs(asset.daysUntilExpiry)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
