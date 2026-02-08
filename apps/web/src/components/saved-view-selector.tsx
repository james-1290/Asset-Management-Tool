import { useState } from "react";
import { Bookmark, Check, MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import type { SavedView, ViewConfiguration } from "../types/saved-view";
import {
  useSavedViews,
  useCreateSavedView,
  useUpdateSavedView,
  useDeleteSavedView,
  useSetDefaultSavedView,
} from "../hooks/use-saved-views";

interface SavedViewSelectorProps {
  entityType: string;
  activeViewId: string | null;
  onApplyView: (view: SavedView) => void;
  getCurrentConfiguration: () => ViewConfiguration;
}

export function SavedViewSelector({
  entityType,
  activeViewId,
  onApplyView,
  getCurrentConfiguration,
}: SavedViewSelectorProps) {
  const { data: views = [] } = useSavedViews(entityType);
  const createMutation = useCreateSavedView(entityType);
  const updateMutation = useUpdateSavedView(entityType);
  const deleteMutation = useDeleteSavedView(entityType);
  const setDefaultMutation = useSetDefaultSavedView(entityType);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editingViewName, setEditingViewName] = useState("");

  const activeView = views.find((v) => v.id === activeViewId);

  function handleSaveCurrentView() {
    if (!newViewName.trim()) return;
    const config = getCurrentConfiguration();
    createMutation.mutate(
      {
        entityType,
        name: newViewName.trim(),
        configuration: JSON.stringify(config),
      },
      {
        onSuccess: (saved) => {
          toast.success(`View "${saved.name}" saved`);
          setSaveDialogOpen(false);
          setNewViewName("");
          onApplyView(saved);
        },
        onError: () => toast.error("Failed to save view"),
      },
    );
  }

  function handleUpdateView(id: string) {
    const view = views.find((v) => v.id === id);
    if (!view) return;
    const config = getCurrentConfiguration();
    updateMutation.mutate(
      {
        id,
        data: { name: view.name, configuration: JSON.stringify(config) },
      },
      {
        onSuccess: () => toast.success(`View "${view.name}" updated`),
        onError: () => toast.error("Failed to update view"),
      },
    );
  }

  function handleRenameView(id: string) {
    if (!editingViewName.trim()) return;
    const view = views.find((v) => v.id === id);
    if (!view) return;
    updateMutation.mutate(
      {
        id,
        data: { name: editingViewName.trim(), configuration: view.configuration },
      },
      {
        onSuccess: () => {
          toast.success("View renamed");
          setEditingViewId(null);
          setEditingViewName("");
        },
        onError: () => toast.error("Failed to rename view"),
      },
    );
  }

  function handleDeleteView(id: string) {
    const view = views.find((v) => v.id === id);
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(`View "${view?.name}" deleted`),
      onError: () => toast.error("Failed to delete view"),
    });
  }

  function handleToggleDefault(id: string) {
    setDefaultMutation.mutate(id, {
      onSuccess: (updated) => {
        toast.success(
          updated.isDefault
            ? `"${updated.name}" set as default`
            : `"${updated.name}" is no longer default`,
        );
      },
      onError: () => toast.error("Failed to update default view"),
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <Bookmark className="h-3.5 w-3.5" />
            {activeView ? activeView.name : "Views"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {views.map((view) => (
            <DropdownMenuItem
              key={view.id}
              onClick={() => onApplyView(view)}
              className="justify-between"
            >
              <span className="flex items-center gap-2">
                {view.isDefault && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                {view.name}
              </span>
              {view.id === activeViewId && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
          {views.length > 0 && <DropdownMenuSeparator />}
          {activeViewId && (
            <DropdownMenuItem onClick={() => handleUpdateView(activeViewId)}>
              Update current view
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
            Save as new view...
          </DropdownMenuItem>
          {views.length > 0 && (
            <DropdownMenuItem onClick={() => setManageDialogOpen(true)}>
              Manage views...
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save new view dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save view</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="view-name">Name</Label>
              <Input
                id="view-name"
                placeholder="e.g. My laptops view"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveCurrentView();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCurrentView}
              disabled={!newViewName.trim() || createMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage views dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage views</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {views.map((view) => (
              <div
                key={view.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                {editingViewId === view.id ? (
                  <Input
                    className="h-7 mr-2"
                    value={editingViewName}
                    onChange={(e) => setEditingViewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameView(view.id);
                      if (e.key === "Escape") setEditingViewId(null);
                    }}
                    onBlur={() => setEditingViewId(null)}
                    autoFocus
                  />
                ) : (
                  <span className="flex items-center gap-2 text-sm">
                    {view.isDefault && (
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    )}
                    {view.name}
                  </span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingViewId(view.id);
                        setEditingViewName(view.name);
                      }}
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleDefault(view.id)}>
                      <Star className="mr-2 h-3.5 w-3.5" />
                      {view.isDefault ? "Unset default" : "Set as default"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeleteView(view.id)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
