import { useState } from "react";
import { Eye, LayoutDashboard, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
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
    <div className="space-y-8">
      {/* Dashboard Widgets Card */}
      <section className="bg-card rounded-xl border overflow-hidden shadow-sm">
        <div className="p-6 border-b flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Dashboard Widgets</h2>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            Choose which widgets appear on your dashboard. Changes take effect after saving.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TOGGLEABLE_WIDGET_IDS.map((id) => (
              <label
                key={id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg cursor-pointer border border-transparent hover:border-primary/20 transition-all"
              >
                <span className="text-sm font-semibold">{WIDGET_LABELS[id]}</span>
                <Switch
                  id={`dash-${id}`}
                  checked={isOn(id)}
                  onCheckedChange={() => handleToggle(id)}
                />
              </label>
            ))}
          </div>

          <div className="pt-4 border-t flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save Widget Preferences
              </Button>
            </div>
          </div>
        </div>
      </section>

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
