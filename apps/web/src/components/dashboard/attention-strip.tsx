import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AttentionStripProps {
  warrantyCount: number;
  certificateCount: number;
  licenceCount: number;
  isLoading: boolean;
}

export function AttentionStrip({
  warrantyCount,
  certificateCount,
  licenceCount,
  isLoading,
}: AttentionStripProps) {
  if (isLoading) {
    return <Skeleton className="h-12 w-full rounded-lg" />;
  }

  const total = warrantyCount + certificateCount + licenceCount;
  if (total === 0) return null;

  const parts: { label: string; count: number; href: string }[] = [];
  if (warrantyCount > 0) {
    parts.push({
      label: warrantyCount === 1 ? "warranty" : "warranties",
      count: warrantyCount,
      href: "/assets?sortBy=warrantyExpiryDate&sortDir=asc",
    });
  }
  if (certificateCount > 0) {
    parts.push({
      label: certificateCount === 1 ? "certificate" : "certificates",
      count: certificateCount,
      href: "/certificates?sortBy=expiryDate&sortDir=asc",
    });
  }
  if (licenceCount > 0) {
    parts.push({
      label: licenceCount === 1 ? "licence" : "licences",
      count: licenceCount,
      href: "/applications?sortBy=expiryDate&sortDir=asc",
    });
  }

  return (
    <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-amber-100 dark:bg-amber-900/50 p-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <p className="text-sm text-amber-900 dark:text-amber-200">
          {parts.map((part, i) => (
            <span key={part.label}>
              {i > 0 && <span className="text-amber-400 dark:text-amber-600 mx-1.5">&middot;</span>}
              <Link
                to={part.href}
                className="font-medium hover:underline underline-offset-2"
              >
                {part.count} {part.label}
              </Link>
            </span>
          ))}
          <span className="text-amber-700/70 dark:text-amber-300/60 ml-1">
            expiring within 30 days
          </span>
        </p>
      </div>
    </div>
  );
}
