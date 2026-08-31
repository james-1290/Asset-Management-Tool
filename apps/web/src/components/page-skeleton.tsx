import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while a route's code is being fetched.
 *
 * Routes are code-split, so there is a brief gap on first visit to each one.
 * This mirrors the shape of a list page — heading, toolbar, rows — so the
 * layout doesn't jump when the real page arrives.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6" role="status" aria-label="Loading page">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
