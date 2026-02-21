import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendInfo {
  value: string;
  direction: "up" | "down" | "flat";
}

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  isLoading: boolean;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "attention";
  iconBg?: string;
  trend?: TrendInfo;
}

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const trendColors = {
  up: "text-emerald-600",
  down: "text-red-500",
  flat: "text-muted-foreground",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  isLoading,
  href,
  onClick,
  variant = "default",
  iconBg = "bg-primary/10 text-primary",
  trend,
}: StatCardProps) {
  const content = (
    <div
      className={[
        "rounded-xl border bg-card p-6 transition-all duration-200 shadow-sm",
        href ? "cursor-pointer hover:shadow-md" : "",
        variant === "attention" ? "border-l-4 border-l-red-500" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColors[trend.direction]}`}>
            {(() => {
              const TrendIcon = trendIcons[trend.direction];
              return <TrendIcon className="h-3.5 w-3.5" />;
            })()}
            <span>{trend.value}</span>
          </div>
        )}
      </div>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      {isLoading ? (
        <Skeleton className="h-8 w-20 mt-1.5" />
      ) : (
        <p className="text-2xl font-bold tracking-tight tabular-nums mt-1">
          {value}
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block h-full no-underline">
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block h-full w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}
