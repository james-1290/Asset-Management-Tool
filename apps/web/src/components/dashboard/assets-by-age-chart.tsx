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
import { CHART_SERIES, chartTooltipStyle } from "@/lib/chart-colors";
import type { AssetsByAgeBucket } from "@/types/dashboard";

interface AssetsByAgeChartProps {
  data: AssetsByAgeBucket[] | undefined;
  isLoading: boolean;
}

export function AssetsByAgeChart({ data, isLoading }: AssetsByAgeChartProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Assets by Age</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            No age data available.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              accessibilityLayer
              aria-label="Assets by age"
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
            >
              <XAxis
                type="number"
                allowDecimals={false}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--color-muted-foreground)" }}
              />
              <YAxis
                type="category"
                dataKey="bucket"
                width={50}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--color-muted-foreground)" }}
              />
              <Tooltip
                cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                contentStyle={chartTooltipStyle}
              />
              <Bar dataKey="count" radius={[0, 3, 3, 0]} fill={CHART_SERIES} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
