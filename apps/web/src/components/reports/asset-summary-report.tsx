import { Download, Loader2, Printer, Package, PoundSterling, AlertTriangle, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAssetSummaryReport } from "@/hooks/use-reports";
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

const statusColors: Record<string, string> = {
  Available: "bg-emerald-500",
  Deployed: "bg-blue-500",
  InRepair: "bg-amber-500",
  InMaintenance: "bg-amber-500",
  CheckedOut: "bg-purple-500",
  InStorage: "bg-yellow-500",
};

export function AssetSummaryReport() {
  const { data, isLoading, dataUpdatedAt } = useAssetSummaryReport();

  async function handleExport() {
    try {
      await reportsApi.downloadAssetSummaryCsv();
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

  const totalCount = data.byStatus.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-6">
      {/* Actions row */}
      <div className="flex items-center justify-between">
        <div>
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Assets</p>
          <p className="text-2xl font-bold tracking-tight mt-1">{data.totalAssets.toLocaleString()}</p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              <PoundSterling className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Value</p>
          <p className="text-2xl font-bold tracking-tight mt-1">
            {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 }).format(data.totalValue)}
          </p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Asset Types</p>
          <p className="text-2xl font-bold tracking-tight mt-1">{data.byType.length}</p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Locations</p>
          <p className="text-2xl font-bold tracking-tight mt-1">{data.byLocation.length}</p>
        </div>
      </div>

      {/* Tables grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Status */}
        <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="font-bold">Assets by Status</h3>
            <Link to="/assets" className="text-sm text-primary font-medium hover:underline">View All</Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Count</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byStatus.map((item) => (
                <TableRow key={item.status}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${statusColors[item.status] ?? "bg-muted-foreground"}`} />
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{item.count}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) : "0.0"}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* By Type */}
        <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="font-bold">Assets by Type</h3>
            <Link to="/assets" className="text-sm text-primary font-medium hover:underline">View All</Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Asset Category</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Total Items</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byType.map((item) => (
                <TableRow key={item.label}>
                  <TableCell className="font-medium">{item.label}</TableCell>
                  <TableCell className="text-right font-medium">{item.count}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) : "0.0"}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* By Location */}
        <div className="bg-card rounded-xl border overflow-hidden shadow-sm lg:col-span-2">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="font-bold">Assets by Location</h3>
            <Link to="/locations" className="text-sm text-primary font-medium hover:underline">View All</Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Location</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Count</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byLocation.map((item) => (
                <TableRow key={item.label}>
                  <TableCell className="font-medium">{item.label}</TableCell>
                  <TableCell className="text-right font-medium">{item.count}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) : "0.0"}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
