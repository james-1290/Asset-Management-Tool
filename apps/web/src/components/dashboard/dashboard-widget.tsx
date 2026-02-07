import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

interface DashboardWidgetProps {
  children: ReactNode;
}

export function DashboardWidget({ children }: DashboardWidgetProps) {
  return (
    <div className="h-full flex flex-col relative group">
      <div className="drag-handle absolute top-3 right-3 z-10 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
