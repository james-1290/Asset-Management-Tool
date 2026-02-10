import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAssetLifecycleReport } from "@/hooks/use-reports";
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

export function AssetLifecycleReport() {
  const { data, isLoading } = useAssetLifecycleReport();

  async function handleExport() {
    try {
      await reportsApi.downloadAssetLifecycleCsv();
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assets by Age</CardTitle>
          <CardDescription>Distribution of assets by purchase age</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Oldest Assets (top 20)
          </CardTitle>
          <CardDescription>
            Assets with the oldest purchase dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.oldestAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No assets with purchase dates recorded.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Asset Tag</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead className="text-right">Age (days)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.oldestAssets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{asset.assetTag}</TableCell>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Past Warranty ({data.pastWarranty.length})
          </CardTitle>
          <CardDescription>
            Assets with expired warranties
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.pastWarranty.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No assets past warranty.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Asset Tag</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Warranty Expired</TableHead>
                  <TableHead className="text-right">Days Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pastWarranty.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{asset.assetTag}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
