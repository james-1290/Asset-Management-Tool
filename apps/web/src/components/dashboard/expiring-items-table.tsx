import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, MoreVertical, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCertificateExpiries,
  useWarrantyExpiries,
  useLicenceExpiries,
} from "@/hooks/use-dashboard";
import type { CertificateExpiryItem, WarrantyExpiryItem, LicenceExpiryItem } from "@/types/dashboard";

type ExpiryCategory = "certificates" | "warranties" | "licences";

const CATEGORY_CONFIG: Record<ExpiryCategory, {
  label: string;
  subtitle: string;
  addLabel: string;
  addHref: string;
}> = {
  certificates: {
    label: "Expiring Certificates",
    subtitle: "Security assets requiring immediate action",
    addLabel: "Add Certificate",
    addHref: "/certificates/new",
  },
  warranties: {
    label: "Expiring Warranties",
    subtitle: "Asset warranties approaching expiry",
    addLabel: "Add Asset",
    addHref: "/assets/new",
  },
  licences: {
    label: "Expiring Licences",
    subtitle: "Software licences approaching renewal",
    addLabel: "Add Application",
    addHref: "/applications/new",
  },
};

interface NormalizedItem {
  id: string;
  name: string;
  typeName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  status?: string;
  href: string;
}

function normalizeCertificates(items: CertificateExpiryItem[]): NormalizedItem[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    typeName: item.certificateTypeName,
    expiryDate: item.expiryDate,
    daysUntilExpiry: item.daysUntilExpiry,
    status: item.status,
    href: `/certificates/${item.id}`,
  }));
}

function normalizeWarranties(items: WarrantyExpiryItem[]): NormalizedItem[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    typeName: item.assetTypeName,
    expiryDate: item.warrantyExpiryDate,
    daysUntilExpiry: item.daysUntilExpiry,
    href: `/assets/${item.id}`,
  }));
}

function normalizeLicences(items: LicenceExpiryItem[]): NormalizedItem[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    typeName: item.applicationTypeName,
    expiryDate: item.expiryDate,
    daysUntilExpiry: item.daysUntilExpiry,
    status: item.status,
    href: `/applications/${item.id}`,
  }));
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
}

function expiryLabel(days: number): { text: string; color: string } {
  if (days < 0) return { text: "EXPIRED", color: "text-red-600" };
  if (days <= 7) return { text: `EXPIRES IN ${days} DAYS`, color: "text-red-600" };
  if (days <= 30) return { text: `EXPIRES IN ${days} DAYS`, color: "text-amber-600" };
  return { text: "HEALTHY", color: "text-emerald-600" };
}

function statusBadge(days: number): { label: string; className: string } {
  if (days < 0) return { label: "Expired", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" };
  if (days <= 7) return { label: "Critical", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" };
  if (days <= 30) return { label: "Warning", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" };
  return { label: "Stable", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" };
}

const PAGE_SIZE_COMFORTABLE = 3;
const PAGE_SIZE_COMPACT = 5;

export function ExpiringItemsTable() {
  const [category, setCategory] = useState<ExpiryCategory>("certificates");
  const [viewMode, setViewMode] = useState<"comfortable" | "compact">("comfortable");
  const [page, setPage] = useState(1);

  const certs = useCertificateExpiries(90, category === "certificates");
  const warranties = useWarrantyExpiries(90, category === "warranties");
  const licences = useLicenceExpiries(90, category === "licences");

  const isLoading =
    (category === "certificates" && certs.isLoading) ||
    (category === "warranties" && warranties.isLoading) ||
    (category === "licences" && licences.isLoading);

  const allItems = useMemo<NormalizedItem[]>(() => {
    switch (category) {
      case "certificates":
        return normalizeCertificates(certs.data ?? []);
      case "warranties":
        return normalizeWarranties(warranties.data ?? []);
      case "licences":
        return normalizeLicences(licences.data ?? []);
    }
  }, [category, certs.data, warranties.data, licences.data]);

  const pageSize = viewMode === "comfortable" ? PAGE_SIZE_COMFORTABLE : PAGE_SIZE_COMPACT;
  const pageCount = Math.max(1, Math.ceil(allItems.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginatedItems = allItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const start = allItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const config = CATEGORY_CONFIG[category];
  const rowPadding = viewMode === "comfortable" ? "py-5" : "py-3";

  function handleCategoryChange(newCategory: ExpiryCategory) {
    setCategory(newCategory);
    setPage(1);
  }

  return (
    <Card>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-xl font-bold text-foreground hover:text-foreground/80 transition-colors">
                  {config.label}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(Object.keys(CATEGORY_CONFIG) as ExpiryCategory[]).map((cat) => (
                  <DropdownMenuItem
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={category === cat ? "font-semibold" : ""}
                  >
                    {CATEGORY_CONFIG[cat].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <p className="text-sm text-muted-foreground mt-0.5">{config.subtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => { setViewMode("comfortable"); setPage(1); }}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "comfortable"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Comfortable
              </button>
              <button
                onClick={() => { setViewMode("compact"); setPage(1); }}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "compact"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Compact
              </button>
            </div>

            <Button size="sm" asChild>
              <Link to={config.addHref}>
                <Plus className="h-4 w-4 mr-1.5" />
                {config.addLabel}
              </Link>
            </Button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : allItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No expiring items found.
          </p>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-t-lg border-b border-border/60">
              <div className="col-span-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Name</div>
              <div className="col-span-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</div>
              <div className="col-span-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Expiry Date</div>
              <div className="col-span-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</div>
              <div className="col-span-2 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/60">
              {paginatedItems.map((item) => {
                const expiry = expiryLabel(item.daysUntilExpiry);
                const badge = statusBadge(item.daysUntilExpiry);

                return (
                  <div key={item.id} className={`grid grid-cols-12 gap-4 px-4 items-center ${rowPadding}`}>
                    <div className="col-span-4">
                      <Link to={item.href} className="text-sm font-medium text-foreground hover:underline underline-offset-2">
                        {item.name}
                      </Link>
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground truncate">
                      {item.typeName}
                    </div>
                    <div className="col-span-2">
                      <div className="text-sm text-foreground">{formatDate(item.expiryDate)}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-wide ${expiry.color}`}>
                        {expiry.text}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link to={item.href}>
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/60">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{start}</span> of{" "}
                <span className="font-semibold text-foreground">{allItems.length}</span>{" "}
                {category}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage >= pageCount}
                  className="px-3 py-1.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
