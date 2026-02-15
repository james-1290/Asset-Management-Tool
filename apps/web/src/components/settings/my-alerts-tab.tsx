import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Bell } from "lucide-react";
import {
  useAlertRules,
  useCreateAlertRule,
  useUpdateAlertRule,
  useDeleteAlertRule,
} from "@/hooks/use-user-notifications";
import type {
  UserAlertRule,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
} from "@/types/user-notification";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/confirm-dialog";

const ENTITY_TYPE_OPTIONS = [
  { value: "warranty", label: "Warranties" },
  { value: "certificate", label: "Certificates" },
  { value: "licence", label: "Licences" },
] as const;

interface FormState {
  name: string;
  entityTypes: string[];
  thresholds: string;
  notifyEmail: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  entityTypes: [],
  thresholds: "",
  notifyEmail: true,
};

function parseEntityTypes(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function entityTypeLabel(value: string): string {
  const option = ENTITY_TYPE_OPTIONS.find((o) => o.value === value);
  return option?.label ?? value;
}

export function MyAlertsTab() {
  const { data: rules = [], isLoading } = useAlertRules();
  const createMutation = useCreateAlertRule();
  const updateMutation = useUpdateAlertRule();
  const deleteMutation = useDeleteAlertRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<UserAlertRule | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<UserAlertRule | null>(null);

  function openCreate() {
    setEditingRule(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setDialogOpen(true);
  }

  function openEdit(rule: UserAlertRule) {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      entityTypes: parseEntityTypes(rule.entityTypes),
      thresholds: rule.thresholds,
      notifyEmail: rule.notifyEmail,
    });
    setFormErrors({});
    setDialogOpen(true);
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (form.entityTypes.length === 0)
      errors.entityTypes = "Select at least one entity type";
    const thresholdParts = form.thresholds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (thresholdParts.length === 0) {
      errors.thresholds = "Enter at least one threshold";
    } else if (thresholdParts.some((p) => isNaN(Number(p)) || Number(p) <= 0)) {
      errors.thresholds = "All thresholds must be positive numbers";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    const thresholds = form.thresholds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(",");

    if (editingRule) {
      const data: UpdateAlertRuleRequest = {
        name: form.name.trim(),
        entityTypes: form.entityTypes.join(","),
        thresholds,
        notifyEmail: form.notifyEmail,
        isActive: editingRule.isActive,
      };
      try {
        await updateMutation.mutateAsync({ id: editingRule.id, data });
        toast.success("Alert rule updated");
        setDialogOpen(false);
      } catch {
        toast.error("Failed to update alert rule");
      }
    } else {
      const data: CreateAlertRuleRequest = {
        name: form.name.trim(),
        entityTypes: form.entityTypes.join(","),
        thresholds,
        notifyEmail: form.notifyEmail,
      };
      try {
        await createMutation.mutateAsync(data);
        toast.success("Alert rule created");
        setDialogOpen(false);
      } catch {
        toast.error("Failed to create alert rule");
      }
    }
  }

  async function handleToggleActive(rule: UserAlertRule) {
    const data: UpdateAlertRuleRequest = {
      name: rule.name,
      entityTypes: rule.entityTypes,
      thresholds: rule.thresholds,
      notifyEmail: rule.notifyEmail,
      isActive: !rule.isActive,
    };
    try {
      await updateMutation.mutateAsync({ id: rule.id, data });
      toast.success(data.isActive ? "Alert rule activated" : "Alert rule deactivated");
    } catch {
      toast.error("Failed to update alert rule");
    }
  }

  function confirmDelete(rule: UserAlertRule) {
    setRuleToDelete(rule);
    setDeleteConfirmOpen(true);
  }

  async function handleDelete() {
    if (!ruleToDelete) return;
    try {
      await deleteMutation.mutateAsync(ruleToDelete.id);
      toast.success("Alert rule deleted");
    } catch {
      toast.error("Failed to delete alert rule");
    }
    setDeleteConfirmOpen(false);
    setRuleToDelete(null);
  }

  function toggleEntityType(value: string) {
    setForm((prev) => ({
      ...prev,
      entityTypes: prev.entityTypes.includes(value)
        ? prev.entityTypes.filter((t) => t !== value)
        : [...prev.entityTypes, value],
    }));
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading alert rules...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">My Alert Rules</h3>
          <p className="text-sm text-muted-foreground">
            Create personal alert rules to get notified about expiring items.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Alert Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No personal alert rules yet. Create one to get notified about
              specific items.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{rule.name}</span>
                    {!rule.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                    {rule.notifyEmail && (
                      <Badge variant="outline" className="text-xs">
                        Email
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {parseEntityTypes(rule.entityTypes).map((et) => (
                      <Badge key={et} variant="secondary" className="text-xs">
                        {entityTypeLabel(et)}
                      </Badge>
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {rule.thresholds
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .join(", ")}{" "}
                      days
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={() => handleToggleActive(rule)}
                    aria-label={`Toggle ${rule.name}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(rule)}
                    aria-label={`Edit ${rule.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => confirmDelete(rule)}
                    aria-label={`Delete ${rule.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Alert Rule" : "New Alert Rule"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Name</Label>
              <Input
                id="rule-name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Critical certificate expiry"
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Entity Types</Label>
              <div className="flex flex-wrap gap-4">
                {ENTITY_TYPE_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`et-${opt.value}`}
                      checked={form.entityTypes.includes(opt.value)}
                      onCheckedChange={() => toggleEntityType(opt.value)}
                    />
                    <Label htmlFor={`et-${opt.value}`} className="font-normal">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
              {formErrors.entityTypes && (
                <p className="text-sm text-destructive">
                  {formErrors.entityTypes}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule-thresholds">Thresholds (days)</Label>
              <Input
                id="rule-thresholds"
                value={form.thresholds}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, thresholds: e.target.value }))
                }
                placeholder="60, 30, 14"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated number of days before expiry to trigger alerts.
              </p>
              {formErrors.thresholds && (
                <p className="text-sm text-destructive">
                  {formErrors.thresholds}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="rule-email">Email notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Receive email when thresholds are reached.
                </p>
              </div>
              <Switch
                id="rule-email"
                checked={form.notifyEmail}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, notifyEmail: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving
                ? "Saving..."
                : editingRule
                  ? "Update Rule"
                  : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Alert Rule"
        description={`Are you sure you want to delete "${ruleToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
