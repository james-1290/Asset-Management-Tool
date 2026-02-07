import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ALL_WIDGET_IDS,
  WIDGET_LABELS,
  type WidgetId,
} from "@/lib/dashboard-preferences";

interface WidgetSettingsPopoverProps {
  isVisible: (id: WidgetId) => boolean;
  toggleWidget: (id: WidgetId) => void;
}

export function WidgetSettingsPopover({
  isVisible,
  toggleWidget,
}: WidgetSettingsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Customize
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <div className="space-y-1">
          <p className="text-sm font-medium mb-3">Visible widgets</p>
          {ALL_WIDGET_IDS.map((id) => (
            <div key={id} className="flex items-center gap-2 py-1">
              <Checkbox
                id={`widget-${id}`}
                checked={isVisible(id)}
                onCheckedChange={() => toggleWidget(id)}
              />
              <Label htmlFor={`widget-${id}`} className="text-sm cursor-pointer">
                {WIDGET_LABELS[id]}
              </Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
