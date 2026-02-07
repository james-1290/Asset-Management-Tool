import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_COLORS } from "@/lib/chart-colors";
import type { StatusBreakdownItem } from "@/types/dashboard";

interface StatusBreakdownChartProps {
  data: StatusBreakdownItem[] | undefined;
  isLoading: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  Available: "Available",
  Assigned: "Assigned",
  CheckedOut: "Checked Out",
  InMaintenance: "In Maintenance",
  Retired: "Retired",
  Sold: "Sold",
  Archived: "Archived",
};

export function StatusBreakdownChart({
  data,
  isLoading,
}: StatusBreakdownChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Status Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[250px]">
            <Skeleton className="h-[200px] w-[200px] rounded-full" />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-12">
            No assets to display.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                label={({ payload }) => {
                  const s = (payload as StatusBreakdownItem).status;
                  const c = (payload as StatusBreakdownItem).count;
                  return `${STATUS_LABELS[s] ?? s}: ${c}`;
                }}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] ?? "#8884d8"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  value,
                  STATUS_LABELS[name as string] ?? name,
                ]}
              />
              <Legend
                formatter={(value: string) => STATUS_LABELS[value] ?? value}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
