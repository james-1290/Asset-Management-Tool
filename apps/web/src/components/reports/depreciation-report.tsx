import { useState } from "react";
import { Download, Loader2, Printer, ChevronDown, ChevronRight, PoundSterling, TrendingDown, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useDepreciationReport } from "@/hooks/use-reports";
import { useAssetTypes } from "@/hooks/use-asset-types";
import { useLocations } from "@/hooks/use-locations";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(value);
}

export function DepreciationReport() {
  const [assetTypeId, setAssetTypeId] = useState<string | undefined>(undefined);
  const [locationId, setLocationId] = useState<string | undefined>(undefined);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data, isLoading, dataUpdatedAt } = useDepreciationReport(assetTypeId, locationId);
  const { data: assetTypes } = useAssetTypes();
  const { data: locations } = useLocations();

  function toggleGroup(typeName: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(typeName)) {
        next.delete(typeName);
      } else {
        next.add(typeName);
      }
      return next;
    });
  }

  function expandAll() {
    if (data) {
      setExpandedGroups(new Set(data.groups.map((g) => g.assetTypeName)));
    }
  }

  function collapseAll() {
    setExpandedGroups(new Set());
  }

  async function handleExport() {
    try {
      await reportsApi.downloadDepreciationCsv(assetTypeId, locationId);
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
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              <PoundSterling className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Original Cost</p>
          <p className="text-2xl font-bold tracking-tight mt-1">{formatCurrency(data.totalOriginalCost)}</p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Depreciation</p>
          <p className="text-2xl font-bold tracking-tight mt-1 text-orange-600 dark:text-orange-400">{formatCurrency(data.totalAccumulatedDepreciation)}</p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-50 text-green-600 dark:bg-green-900/40 dark:text-green-400">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Book Value</p>
          <p className="text-2xl font-bold tracking-tight mt-1 text-green-600 dark:text-green-400">{formatCurrency(data.totalBookValue)}</p>
        </div>
      </div>

      {/* Filters + Export */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Asset Type:</span>
          <Select
            value={assetTypeId ?? "all"}
            onValueChange={(v) =>
              setAssetTypeId(v === "all" ? undefined : v)
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {assetTypes?.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Location:</span>
          <Select
            value={locationId ?? "all"}
            onValueChange={(v) =>
              setLocationId(v === "all" ? undefined : v)
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locations?.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
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

      {/* Timestamp */}
      {dataUpdatedAt > 0 && (
        <p className="text-xs text-muted-foreground">
          Generated: {new Date(dataUpdatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}

      {/* Grouped Tables */}
      {data.groups.length === 0 ? (
        <div className="bg-card rounded-xl border p-8 shadow-sm">
          <p className="text-sm text-muted-foreground text-center">
            No depreciable assets found with the current filters.
          </p>
        </div>
      ) : (
        data.groups.map((group) => {
          const isExpanded = expandedGroups.has(group.assetTypeName);
          return (
            <div key={group.assetTypeName} className="bg-card rounded-xl border overflow-hidden shadow-sm">
              <button
                type="button"
                className="w-full px-6 py-4 border-b flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleGroup(group.assetTypeName)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <h3 className="font-bold">
                    {group.assetTypeName}{" "}
                    <span className="text-muted-foreground font-normal">
                      ({group.assets.length}{" "}
                      {group.assets.length === 1 ? "asset" : "assets"})
                    </span>
                  </h3>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cost: </span>
                    <span className="font-medium">
                      {formatCurrency(group.subtotalOriginalCost)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Depreciation: </span>
                    <span className="font-medium text-orange-600 dark:text-orange-400">
                      {formatCurrency(group.subtotalAccumulatedDepreciation)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Book Value: </span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(group.subtotalBookValue)}
                    </span>
                  </div>
                </div>
              </button>
              {isExpanded && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Asset Name</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Purchase Date</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Original Cost</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Method</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Useful Life (Yrs)</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Accum. Depreciation</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Book Value</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Remaining (Mths)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">
                          <Link
                            to={`/assets/${asset.id}`}
                            className="text-primary hover:underline"
                          >
                            {asset.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {asset.purchaseDate
                            ? new Date(asset.purchaseDate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(asset.originalCost)}
                        </TableCell>
                        <TableCell>{asset.depreciationMethod}</TableCell>
                        <TableCell className="text-right">
                          {asset.usefulLifeYears ?? "-"}
                        </TableCell>
                        <TableCell className="text-right text-orange-600 dark:text-orange-400">
                          {formatCurrency(asset.accumulatedDepreciation)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400 font-medium">
                          {formatCurrency(asset.currentBookValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {asset.remainingUsefulLifeMonths ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
