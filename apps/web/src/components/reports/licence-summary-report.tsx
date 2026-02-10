import { Download, Loader2 } from "lucide-react";
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

export function LicenceSummaryReport() {
  const { data, isLoading } = useLicenceSummaryReport();

  async function handleExport() {
    try {
      await reportsApi.downloadLicenceSummaryCsv();
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
        <div />
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

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
          <CardTitle className="text-base">Expiring Soon (next 30 days)</CardTitle>
          <CardDescription>
            Applications with licences expiring within 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.expiringSoon.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No licences expiring in the next 30 days.
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
