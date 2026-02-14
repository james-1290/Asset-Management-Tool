import { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { useExpiriesReport } from "@/hooks/use-reports";
import { reportsApi } from "@/lib/api/reports";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Upcoming Expiries ({data.totalCount})
          </CardTitle>
          <CardDescription>
            Combined warranty, certificate, and licence expiries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No expiries in the selected date range.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead className="text-right">Days Left</TableHead>
                  <TableHead>Status</TableHead>
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
        </CardContent>
      </Card>
    </div>
  );
}
