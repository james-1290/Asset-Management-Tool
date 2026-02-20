import { useState } from "react";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TOGGLEABLE_WIDGET_IDS,
  WIDGET_LABELS,
  preferencesStore,
  type WidgetId,
} from "@/lib/dashboard-preferences";
import { DashboardPreview } from "@/components/settings/dashboard-preview";

const DEFAULT_VISIBLE: WidgetId[] = [
  "statusBreakdown",
  "recentActivity",
  "expiringItems",
];

export function DashboardTab() {
  const [visible, setVisible] = useState<WidgetId[]>(() => {
    const prefs = preferencesStore.load();
    return prefs.visibleWidgets;
  });
  const [previewOpen, setPreviewOpen] = useState(false);

  const isOn = (id: WidgetId) => visible.includes(id);

  function handleToggle(id: WidgetId) {
    setVisible((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    );
  }

  function handleSave() {
    const prefs = preferencesStore.load();
    preferencesStore.save({ ...prefs, visibleWidgets: visible });
    toast.success("Dashboard preferences saved");
  }

  function handleReset() {
    setVisible(DEFAULT_VISIBLE);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <h3 className="text-sm font-medium">Dashboard Widgets</h3>
            <p className="text-sm text-muted-foreground">
              Choose which widgets appear on your dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TOGGLEABLE_WIDGET_IDS.map((id) => (
              <div
                key={id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <Label htmlFor={`dash-${id}`} className="text-sm cursor-pointer">
                  {WIDGET_LABELS[id]}
                </Label>
                <Switch
                  id={`dash-${id}`}
                  checked={isOn(id)}
                  onCheckedChange={() => handleToggle(id)}
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-2">
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="mr-1.5 h-4 w-4" />
              Preview
            </Button>
            <Button size="sm" variant="ghost" onClick={handleReset}>
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[calc(100vw-4rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dashboard Preview</DialogTitle>
          </DialogHeader>
          {previewOpen && (
            <DashboardPreview
              isVisible={(id: WidgetId) => visible.includes(id)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
