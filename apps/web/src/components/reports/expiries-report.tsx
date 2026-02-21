import { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { useExpiriesReport } from "@/hooks/use-reports";
import { reportsApi } from "@/lib/api/reports";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

function categoryColor(category: string) {
  switch (category) {
    case "Warranty":
      return "default";
    case "Certificate":
      return "secondary";
    case "Licence":
      return "outline";
    default:
      return "default";
  }
}

export function ExpiriesReport() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: todayISO(),
    to: addDays(todayISO(), 30),
  });
  const { data, isLoading, dataUpdatedAt } = useExpiriesReport(dateRange.from, dateRange.to);

  async function handleExport() {
    try {
      await reportsApi.downloadExpiriesCsv(dateRange.from, dateRange.to);
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

      <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b">
          <h3 className="font-bold">Upcoming Expiries ({data.totalCount})</h3>
          <p className="text-sm text-muted-foreground">Combined warranty, certificate, and licence expiries</p>
        </div>
        {data.items.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-muted-foreground text-center">
              No expiries in the selected date range.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Expiry Date</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Days Left</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={`${item.category}-${item.id}`}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant={categoryColor(item.category) as "default" | "secondary" | "outline"}>
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.typeName}</TableCell>
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
