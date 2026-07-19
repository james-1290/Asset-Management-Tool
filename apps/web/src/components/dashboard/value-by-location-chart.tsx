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
import { formatCurrency, getCurrencySymbol } from "@/lib/format";
import type { ValueByLocation } from "@/types/dashboard";

interface ValueByLocationChartProps {
  data: ValueByLocation[] | undefined;
  isLoading: boolean;
}

export function ValueByLocationChart({ data, isLoading }: ValueByLocationChartProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Value by Location</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            No value data available.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              accessibilityLayer
              aria-label="Value by location"
              data={data}
              margin={{ top: 4, right: 4, left: -4, bottom: 0 }}
            >
              <XAxis
                dataKey="locationName"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--color-muted-foreground)" }}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 1000
                    ? `${getCurrencySymbol()}${(v / 1000).toFixed(0)}k`
                    : `${getCurrencySymbol()}${v.toFixed(0)}`
                }
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--color-muted-foreground)" }}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value as number, { minimumFractionDigits: 0, maximumFractionDigits: 0 }), "Value"]}
                cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                contentStyle={chartTooltipStyle}
              />
              <Bar dataKey="totalValue" radius={[3, 3, 0, 0]} fill={CHART_SERIES} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
