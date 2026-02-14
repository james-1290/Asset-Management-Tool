import { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { useLicenceSummaryReport } from "@/hooks/use-reports";
import { reportsApi } from "@/lib/api/reports";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    { label: "Active", count: data.active },
    { label: "Expired", count: data.expired },
    { label: "Pending Renewal", count: data.pendingRenewal },
    { label: "Suspended", count: data.suspended },
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
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="no-print">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {(dateRange.from || dateRange.to) && (
        <p className="text-xs text-muted-foreground">
          Showing: {dateRange.from ?? "start"} to {dateRange.to ?? "end"}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Applications</CardDescription>
            <CardTitle className="text-3xl">{data.totalApplications}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Spend</CardDescription>
            <CardTitle className="text-3xl">
              ${data.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>By Status</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1 text-sm">
              {statusItems.map((s) => (
                <div key={s.label} className="flex justify-between">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expiring Soon</CardTitle>
          <CardDescription>
            Applications with licences expiring in the selected range
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.expiringSoon.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No licences expiring in the selected date range.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead className="text-right">Days Left</TableHead>
                  <TableHead>Status</TableHead>
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
        </CardContent>
      </Card>
    </div>
  );
}
