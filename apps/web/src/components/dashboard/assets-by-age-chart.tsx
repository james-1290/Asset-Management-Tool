import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssetsByAgeBucket } from "@/types/dashboard";

interface AssetsByAgeChartProps {
  data: AssetsByAgeBucket[] | undefined;
  isLoading: boolean;
}

export function AssetsByAgeChart({ data, isLoading }: AssetsByAgeChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assets by Age</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[250px] w-full" />
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            No age data available.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="bucket" width={50} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
