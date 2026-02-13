import type { ReactNode } from "react";

interface DashboardWidgetProps {
  children: ReactNode;
}

export function DashboardWidget({ children }: DashboardWidgetProps) {
  return <div className="h-full">{children}</div>;
}
