import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BAR_CHART_COLOR } from "@/lib/chart-colors";
import type { AssetsByGroupItem } from "@/types/dashboard";

interface AssetsByTypeChartProps {
  data: AssetsByGroupItem[] | undefined;
  isLoading: boolean;
}

export function AssetsByTypeChart({
  data,
  isLoading,
}: AssetsByTypeChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assets by Type</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[250px] w-full" />
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-12">
            No assets to display.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <XAxis dataKey="label" fontSize={12} tickLine={false} />
              <YAxis allowDecimals={false} fontSize={12} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill={BAR_CHART_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
