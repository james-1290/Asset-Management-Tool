import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  InRepair: "In Repair",
  Retired: "Retired",
  Sold: "Sold",
  Archived: "Archived",
};

/** Indigo/purple palette matching the mockup donut */
const DONUT_COLORS = [
  "#2918dc", // deep indigo
  "#4338ca", // indigo-700
  "#6366f1", // indigo-500
  "#818cf8", // indigo-400
  "#a5b4fc", // indigo-300
  "#c7d2fe", // indigo-200
  "#e0e7ff", // indigo-100
  "#ddd6fe", // violet-200
];

const tooltipStyle = {
  borderRadius: "8px",
  border: "1px solid var(--color-border)",
  backgroundColor: "var(--color-card)",
  fontSize: "12px",
  boxShadow: "0 2px 8px rgb(0 0 0 / 0.06)",
};

function formatTotal(total: number): string {
  if (total >= 1000) return `${(total / 1000).toFixed(1)}k`;
  return total.toString();
}

export function StatusBreakdownChart({
  data,
  isLoading,
}: StatusBreakdownChartProps) {
  const navigate = useNavigate();

  function handlePieClick(entry: StatusBreakdownItem) {
    navigate(`/assets?status=${entry.status}`);
  }

  const total = data?.reduce((sum, item) => sum + item.count, 0) ?? 0;

  // Sort by count descending for consistent legend ordering
  const sorted = data ? [...data].sort((a, b) => b.count - a.count) : [];

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-foreground">Asset Breakdown</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Inventory distribution across main categories
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-6">
            <Skeleton className="h-[160px] w-[160px] rounded-full shrink-0" />
            <div className="flex-1 grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No assets to display.
          </p>
        ) : (
          <div className="flex items-center gap-6">
            {/* Donut chart */}
            <div className="shrink-0 w-[160px] h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sorted}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={2}
                    style={{ cursor: "pointer" }}
                    onClick={(_data, index) => {
                      if (sorted[index]) handlePieClick(sorted[index]);
                    }}
                  >
                    {sorted.map((entry, i) => (
                      <Cell
                        key={entry.status}
                        fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                        stroke="none"
                      />
                    ))}
                    <Label
                      position="center"
                      content={() => (
                        <text
                          x="50%"
                          y="50%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x="50%"
                            dy="-8"
                            className="fill-foreground text-3xl font-bold"
                          >
                            {formatTotal(total)}
                          </tspan>
                          <tspan
                            x="50%"
                            dy="22"
                            className="fill-muted-foreground text-[11px] uppercase tracking-widest"
                          >
                            ASSETS
                          </tspan>
                        </text>
                      )}
                    />
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      value,
                      STATUS_LABELS[name as string] ?? name,
                    ]}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend with progress bars */}
            <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-4">
              {sorted.map((item, i) => {
                const pct = total > 0 ? (item.count / total) * 100 : 0;
                const color = DONUT_COLORS[i % DONUT_COLORS.length];
                return (
                  <div key={item.status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm text-foreground">
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {Math.round(pct)}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
