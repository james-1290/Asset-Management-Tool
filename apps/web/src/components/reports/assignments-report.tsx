import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAssignmentsReport } from "@/hooks/use-reports";
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

export function AssignmentsReport() {
  const { data, isLoading } = useAssignmentsReport();

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
        <div />
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Assigned Assets</CardDescription>
            <CardTitle className="text-3xl">{data.totalAssigned}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>People with Assignments</CardDescription>
            <CardTitle className="text-3xl">{data.totalPeople}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assignments by Person</CardTitle>
          <CardDescription>
            People and their currently assigned assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.people.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No active assignments.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Assets</TableHead>
                  <TableHead>Assigned Items</TableHead>
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
                    <TableCell className="text-right">
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
        </CardContent>
      </Card>
    </div>
  );
}
