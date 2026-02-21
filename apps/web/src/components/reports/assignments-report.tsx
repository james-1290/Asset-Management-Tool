import { Download, Loader2, Printer, Package, Users } from "lucide-react";
import { toast } from "sonner";
import { useAssignmentsReport } from "@/hooks/use-reports";
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

export function AssignmentsReport() {
  const { data, isLoading, dataUpdatedAt } = useAssignmentsReport();

  async function handleExport() {
    try {
      await reportsApi.downloadAssignmentsCsv();
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
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Assigned</p>
          <p className="text-2xl font-bold tracking-tight mt-1">{data.totalAssigned}</p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">People with Assignments</p>
          <p className="text-2xl font-bold tracking-tight mt-1">{data.totalPeople}</p>
        </div>
      </div>

      {/* Assignments table */}
      <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b">
          <h3 className="font-bold">Assignments by Person</h3>
          <p className="text-sm text-muted-foreground">People and their currently assigned assets</p>
        </div>
        {data.people.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-muted-foreground text-center">
              No active assignments.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Person</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Assets</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned Items</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.people.map((person) => (
                <TableRow key={person.personId}>
                  <TableCell className="font-medium">
                    {person.fullName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {person.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {person.assignedAssetCount}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {person.assets
                      .map((a) => a.name)
                      .join(", ")}
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
