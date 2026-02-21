import { useState } from "react";
import { Download, Loader2, Printer, FileText, PoundSterling, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useLicenceSummaryReport } from "@/hooks/use-reports";
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

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function LicenceSummaryReport() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: todayISO(),
    to: addDays(todayISO(), 30),
  });
  const { data, isLoading, dataUpdatedAt } = useLicenceSummaryReport(dateRange.from, dateRange.to);

  async function handleExport() {
    try {
      await reportsApi.downloadLicenceSummaryCsv(dateRange.from, dateRange.to);
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

  const statusItems = [
    { label: "Active", count: data.active, color: "bg-emerald-500" },
    { label: "Expired", count: data.expired, color: "bg-red-500" },
    { label: "Pending Renewal", count: data.pendingRenewal, color: "bg-amber-500" },
    { label: "Suspended", count: data.suspended, color: "bg-slate-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            defaultPreset="next30"
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Applications</p>
          <p className="text-2xl font-bold tracking-tight mt-1">{data.totalApplications}</p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              <PoundSterling className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Spend</p>
          <p className="text-2xl font-bold tracking-tight mt-1">
            {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 }).format(data.totalSpend)}
          </p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-50 text-green-600 dark:bg-green-900/40 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold tracking-tight mt-1">{data.active}</p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-400">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Expired</p>
          <p className="text-2xl font-bold tracking-tight mt-1">{data.expired}</p>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b">
          <h3 className="font-bold">Licence Status Breakdown</h3>
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
            {statusItems.map((s) => (
              <TableRow key={s.label}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${s.color}`} />
                    {s.label}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">{s.count}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {data.totalApplications > 0 ? ((s.count / data.totalApplications) * 100).toFixed(1) : "0.0"}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Expiring soon */}
      <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b">
          <h3 className="font-bold">Expiring Soon</h3>
          <p className="text-sm text-muted-foreground">Applications with licences expiring in the selected range</p>
        </div>
        {data.expiringSoon.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-muted-foreground text-center">
              No licences expiring in the selected date range.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Expiry Date</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Days Left</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.expiringSoon.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.applicationTypeName}</TableCell>
                  <TableCell>
                    {new Date(item.expiryDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        item.daysUntilExpiry <= 7
                          ? "text-destructive font-medium"
                          : item.daysUntilExpiry <= 14
                            ? "text-orange-500 font-medium"
                            : ""
                      }
                    >
                      {item.daysUntilExpiry}
                    </span>
                  </TableCell>
                  <TableCell>{item.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
