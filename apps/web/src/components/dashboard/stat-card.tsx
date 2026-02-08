import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  isLoading: boolean;
  href?: string;
  iconColor?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  isLoading,
  href,
  iconColor = "bg-muted text-muted-foreground",
}: StatCardProps) {
  const content = (
    <Card className={`h-full${href ? " cursor-pointer hover:shadow-md transition-shadow" : ""}`}>
      <CardContent className="pt-6 h-full flex items-center gap-4">
        <div className={`rounded-full p-3 shrink-0 ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          {isLoading ? (
            <Skeleton className="h-8 w-20 mb-1" />
          ) : (
            <p className="text-2xl font-bold truncate">{value}</p>
          )}
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href} className="block h-full no-underline">{content}</Link>;
  }

  return content;
}
