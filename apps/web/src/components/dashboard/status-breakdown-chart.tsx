import { useNavigate } from "react-router-dom";
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

const tooltipStyle = {
  borderRadius: "8px",
  border: "1px solid var(--color-border)",
  backgroundColor: "var(--color-card)",
  fontSize: "12px",
  boxShadow: "0 2px 8px rgb(0 0 0 / 0.06)",
};

export function StatusBreakdownChart({
  data,
  isLoading,
}: StatusBreakdownChartProps) {
  const navigate = useNavigate();

  function handlePieClick(entry: StatusBreakdownItem) {
    navigate(`/assets?status=${entry.status}`);
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Status Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Skeleton className="h-[180px] w-[180px] rounded-full" />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-12">
            No assets to display.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                style={{ cursor: "pointer" }}
                onClick={(_data, index) => {
                  if (data[index]) handlePieClick(data[index]);
                }}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] ?? "#8884d8"}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  value,
                  STATUS_LABELS[name as string] ?? name,
                ]}
                contentStyle={tooltipStyle}
              />
              <Legend
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-muted-foreground">
                    {STATUS_LABELS[value] ?? value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
