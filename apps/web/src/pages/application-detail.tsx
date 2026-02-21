import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Pencil, Info, History, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { ApplicationStatusBadge } from "../components/applications/application-status-badge";
import { ApplicationHistoryTimeline } from "../components/applications/application-history-timeline";
import { ApplicationHistoryDialog } from "../components/applications/application-history-dialog";
import { ApplicationFormDialog } from "../components/applications/application-form-dialog";
import { DeactivateApplicationDialog } from "../components/applications/deactivate-application-dialog";
import {
  useApplication,
  useApplicationHistory,
  useUpdateApplication,
  useDeactivateApplication,
  useReactivateApplication,
} from "../hooks/use-applications";
import { useApplicationTypes } from "../hooks/use-application-types";
import { useLocations } from "../hooks/use-locations";
import { AttachmentsSection } from "../components/shared/attachments-section";
import type { ApplicationFormValues } from "../lib/schemas/application";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number | null): string | null {
  if (value == null) return null;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatCustomFieldValue(value: string | null, fieldType: string): string | null {
  if (!value) return null;
  switch (fieldType) {
    case "Boolean":
      return value === "true" ? "Yes" : "No";
    case "Date":
      return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    case "MultiSelect": {
      try {
        const arr = JSON.parse(value);
        if (Array.isArray(arr)) return arr.join(", ");
      } catch { /* fall through */ }
      return value;
    }
    default:
      return value;
  }
}

function isExpiringSoon(iso: string | null): boolean {
  if (!iso) return false;
  const expiry = new Date(iso);
  const now = new Date();
  const daysUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntil <= 90 && daysUntil >= 0;
}

function isExpired(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

const LICENCE_TYPE_LABELS: Record<string, string> = {
  PerSeat: "Per Seat",
  Site: "Site",
  Volume: "Volume",
  OpenSource: "Open Source",
  Trial: "Trial",
  Freeware: "Freeware",
  Subscription: "Subscription",
  Perpetual: "Perpetual",
};

const HISTORY_PREVIEW_LIMIT = 5;

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: application, isLoading, isError } = useApplication(id!);
  const { data: history, isLoading: historyLoading } = useApplicationHistory(id!, HISTORY_PREVIEW_LIMIT);
  const { data: applicationTypes } = useApplicationTypes();
  const { data: locations } = useLocations();
  const updateMutation = useUpdateApplication();
  const deactivateMutation = useDeactivateApplication();
  const reactivateMutation = useReactivateApplication();

  const [formOpen, setFormOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  function handleFormSubmit(values: ApplicationFormValues) {
    if (!application) return;

    const customFieldValues = Object.entries(values.customFieldValues ?? {})
      .filter(([, v]) => v != null && v !== "" && v !== "__none__")
      .map(([fieldDefinitionId, value]) => ({
        fieldDefinitionId,
        value: value!,
      }));

    const data = {
      name: values.name,
      applicationTypeId: values.applicationTypeId,
      publisher: values.publisher || null,
      version: values.version || null,
      licenceKey: values.licenceKey || null,
      licenceType: values.licenceType && values.licenceType !== "none" ? values.licenceType : null,
      maxSeats: values.maxSeats ? parseInt(values.maxSeats, 10) : null,
      usedSeats: values.usedSeats ? parseInt(values.usedSeats, 10) : null,
      purchaseDate: values.purchaseDate ? `${values.purchaseDate}T00:00:00Z` : null,
      expiryDate: values.expiryDate ? `${values.expiryDate}T00:00:00Z` : null,
      purchaseCost: values.purchaseCost ? parseFloat(values.purchaseCost) : null,
      autoRenewal: values.autoRenewal ?? false,
      status: values.status || "Active",
      notes: values.notes || null,
      assetId: values.assetId && values.assetId !== "none" ? values.assetId : null,
      personId: values.personId && values.personId !== "none" ? values.personId : null,
      locationId: values.locationId && values.locationId !== "none" ? values.locationId : null,
      customFieldValues,
    };

    updateMutation.mutate(
      { id: application.id, data },
      {
        onSuccess: () => {
          toast.success("Application updated");
          setFormOpen(false);
        },
        onError: () => {
          toast.error("Failed to update application");
        },
      },
    );
  }

  function handleDeactivate(notes: string | null, deactivatedDate: string | null) {
    if (!application) return;
    deactivateMutation.mutate(
      { id: application.id, data: { notes, deactivatedDate } },
      {
        onSuccess: () => {
          toast.success("Application deactivated");
          setDeactivateOpen(false);
        },
        onError: () => {
          toast.error("Failed to deactivate application");
        },
      },
    );
  }

  function handleReactivate() {
    if (!application) return;
    reactivateMutation.mutate(
      { id: application.id, data: {} },
      {
        onSuccess: () => {
          toast.success("Application reactivated");
        },
        onError: () => {
          toast.error("Failed to reactivate application");
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !application) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/applications")}>
          Back to Applications
        </Button>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Application not found or failed to load.
        </div>
      </div>
    );
  }

  const hasMoreHistory = history && history.length >= HISTORY_PREVIEW_LIMIT;

  // Seat usage bar
  const seatPercent =
    application.maxSeats && application.usedSeats
      ? Math.min(100, Math.round((application.usedSeats / application.maxSeats) * 100))
      : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-muted flex items-center justify-center">
              <span className="text-lg font-bold text-muted-foreground">
                {application.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{application.name}</h1>
                <ApplicationStatusBadge status={application.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {application.applicationTypeName}
                {application.publisher && ` · ${application.publisher}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {application.status !== "Inactive" && !application.isArchived && (
              <Button
                variant="outline"
                onClick={() => setDeactivateOpen(true)}
                className="font-semibold"
              >
                Deactivate
              </Button>
            )}
            {application.status === "Inactive" && !application.isArchived && (
              <Button
                variant="outline"
                onClick={handleReactivate}
                disabled={reactivateMutation.isPending}
                className="font-semibold"
              >
                {reactivateMutation.isPending ? "Reactivating..." : "Reactivate"}
              </Button>
            )}
            <Button onClick={() => setFormOpen(true)} className="font-semibold shadow-lg">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Details
            </Button>
          </div>
        </div>
        {/* Breadcrumbs */}
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <Link to="/applications" className="hover:text-primary">Applications</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{application.name}</span>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Application Details */}
        <section className="lg:col-span-2">
          <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b flex items-center">
              <h3 className="font-bold flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Application Details
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Name</p>
                  <p className="text-sm font-medium">{application.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Publisher</p>
                  <p className="text-sm font-medium">{application.publisher || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">License Type</p>
                  <p className="text-sm font-medium">
                    {application.licenceType ? LICENCE_TYPE_LABELS[application.licenceType] ?? application.licenceType : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Max Seats</p>
                  <p className="text-sm font-medium">{application.maxSeats?.toString() ?? "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Used Seats</p>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium">{application.usedSeats?.toString() ?? "—"}</p>
                    {seatPercent !== null && (
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: `${seatPercent}%` }} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Purchase Date</p>
                  <p className="text-sm font-medium">{formatDate(application.purchaseDate) ?? "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Expiry Date</p>
                  <p className={`text-sm font-medium ${isExpired(application.expiryDate) ? "text-red-500 font-bold" : isExpiringSoon(application.expiryDate) ? "text-orange-500 font-bold" : ""}`}>
                    {formatDate(application.expiryDate) ?? "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Purchase Cost</p>
                  <p className="text-sm font-medium">{formatCurrency(application.purchaseCost) ?? "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Auto Renewal</p>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    {application.autoRenewal ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Enabled
                      </>
                    ) : (
                      "Disabled"
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Location</p>
                  <p className="text-sm font-medium">{application.locationName || "—"}</p>
                </div>
                {application.version && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Version</p>
                    <p className="text-sm font-medium">{application.version}</p>
                  </div>
                )}
                {application.licenceKey && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Licence Key</p>
                    <p className="text-sm font-medium font-mono text-xs">{application.licenceKey}</p>
                  </div>
                )}
                {application.assetName && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Linked Asset</p>
                    <p className="text-sm font-medium text-primary">{application.assetName}</p>
                  </div>
                )}
                {application.personName && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Managed By</p>
                    <p className="text-sm font-medium">{application.personName}</p>
                  </div>
                )}
              </div>

              {/* Custom Fields */}
              {application.customFieldValues && application.customFieldValues.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Custom Fields</p>
                  <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                    {application.customFieldValues.map((cfv) => (
                      <div key={cfv.fieldDefinitionId} className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{cfv.fieldName}</p>
                        <p className="text-sm font-medium">{formatCustomFieldValue(cfv.value, cfv.fieldType) ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {application.notes && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{application.notes}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* History */}
        <section>
          <div className="bg-card rounded-xl border overflow-hidden shadow-sm h-full">
            <div className="px-6 py-4 border-b">
              <h3 className="font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                History
              </h3>
            </div>
            <div className="p-6">
              <ApplicationHistoryTimeline
                history={history}
                isLoading={historyLoading}
              />
              {hasMoreHistory && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setHistoryOpen(true)}
                >
                  View All History
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Attachments */}
      <AttachmentsSection entityType="Application" entityId={application.id} />

      {/* Dialogs */}
      <ApplicationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        application={application}
        applicationTypes={applicationTypes ?? []}
        locations={locations ?? []}
        onSubmit={handleFormSubmit}
        loading={updateMutation.isPending}
      />

      <ApplicationHistoryDialog
        applicationId={application.id}
        applicationName={application.name}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />

      <DeactivateApplicationDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        applicationName={application.name}
        onSubmit={handleDeactivate}
        loading={deactivateMutation.isPending}
      />
    </div>
  );
}
