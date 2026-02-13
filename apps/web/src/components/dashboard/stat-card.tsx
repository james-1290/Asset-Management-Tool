import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  isLoading: boolean;
  href?: string;
  variant?: "default" | "attention";
}

export function StatCard({
  title,
  value,
  icon: Icon,
  isLoading,
  href,
  variant = "default",
}: StatCardProps) {
  const content = (
    <div
      className={[
        "rounded-lg border bg-card p-4 transition-all duration-200",
        "shadow-[0_1px_3px_0_rgba(0,0,0,0.1)]",
        href ? "cursor-pointer hover:shadow-[0_2px_6px_0_rgba(0,0,0,0.12)]" : "",
        variant === "attention" ? "border-l-2 border-l-amber-400 dark:border-l-amber-500" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          {isLoading ? (
            <Skeleton className="h-8 w-20 mt-2" />
          ) : (
            <p className="text-[22px] font-semibold tracking-tight tabular-nums mt-1.5 truncate">
              {value}
            </p>
          )}
        </div>
        <Icon className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block h-full no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
