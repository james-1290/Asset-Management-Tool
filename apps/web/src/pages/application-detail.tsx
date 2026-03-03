import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Pencil,
  History,
  ChevronRight,
  CheckCircle2,
  AppWindow,
  Key,
  Layers,
  StickyNote,
  Maximize2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { DetailCard, SectionHeader, DetailRow, MetricBlock } from "../components/detail-layout";
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

  const detailsRef = useRef<HTMLDivElement>(null);
  const [detailsHeight, setDetailsHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!detailsRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setDetailsHeight(entry.contentRect.height);
    });
    observer.observe(detailsRef.current);
    return () => observer.disconnect();
  }, [application]);

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
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
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

  const hasDates = application.purchaseDate || application.expiryDate;

  const expiryClassName = isExpired(application.expiryDate)
    ? "text-red-500 font-bold"
    : isExpiringSoon(application.expiryDate)
      ? "text-orange-500 font-bold"
      : "";

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
        <Link to="/applications" className="hover:text-primary transition-colors">
          Applications
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{application.name}</span>
      </div>

      {/* Hero Card */}
      <DetailCard className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <div className="size-20 rounded-xl bg-muted flex items-center justify-center">
            <AppWindow className="h-9 w-9 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
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

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {application.status !== "Inactive" && !application.isArchived && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeactivateOpen(true)}
            >
              Deactivate
            </Button>
          )}
          {application.status === "Inactive" && !application.isArchived && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReactivate}
              disabled={reactivateMutation.isPending}
            >
              {reactivateMutation.isPending ? "Reactivating..." : "Reactivate"}
            </Button>
          )}
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </DetailCard>

      {/* Three-column grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left two-thirds */}
        <div ref={detailsRef} className="lg:col-span-2 flex flex-col gap-6">
          {/* Top row: Details + Licensing side by side */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Application details card */}
            <DetailCard>
              <SectionHeader icon={AppWindow} title="Application details" />
              <div className="space-y-3">
                <DetailRow label="Name" value={application.name} />
                <DetailRow label="Publisher" value={application.publisher || "—"} />
                <DetailRow label="Version" value={application.version || "—"} />
                <DetailRow
                  label="Licence type"
                  value={
                    application.licenceType
                      ? LICENCE_TYPE_LABELS[application.licenceType] ?? application.licenceType
                      : "—"
                  }
                />
                <DetailRow label="Licence key" value={application.licenceKey || "—"} />
                {application.assetName && (
                  <DetailRow
                    label="Linked asset"
                    value={
                      <span className="text-primary">{application.assetName}</span>
                    }
                  />
                )}
                {application.personName && (
                  <DetailRow label="Managed by" value={application.personName} />
                )}
              </div>
            </DetailCard>

            {/* Licensing card */}
            <DetailCard>
              <SectionHeader icon={Key} title="Licensing" />
              <div className="space-y-3">
                <DetailRow label="Max seats" value={application.maxSeats?.toString() ?? "—"} />
                <DetailRow
                  label="Used seats"
                  value={
                    <div className="flex items-center gap-3">
                      <span>{application.usedSeats?.toString() ?? "—"}</span>
                      {seatPercent !== null && (
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${seatPercent}%` }} />
                        </div>
                      )}
                    </div>
                  }
                />
                <DetailRow label="Purchase cost" value={formatCurrency(application.purchaseCost) ?? "—"} />
                <DetailRow
                  label="Auto renewal"
                  value={
                    application.autoRenewal ? (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Enabled
                      </span>
                    ) : (
                      "Disabled"
                    )
                  }
                />
              </div>
            </DetailCard>
          </div>

          {/* Dates MetricBlock row */}
          {hasDates && (
            <DetailCard>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                <MetricBlock
                  label="Purchase date"
                  value={formatDate(application.purchaseDate) ?? "—"}
                />
                <MetricBlock
                  label="Expiry date"
                  value={formatDate(application.expiryDate) ?? "—"}
                  className={expiryClassName}
                />
              </div>
            </DetailCard>
          )}

          {/* Custom fields */}
          {application.customFieldValues && application.customFieldValues.length > 0 && (
            <DetailCard>
              <SectionHeader icon={Layers} title="Custom fields" />
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {application.customFieldValues.map((cfv) => (
                  <DetailRow
                    key={cfv.fieldDefinitionId}
                    label={cfv.fieldName}
                    value={formatCustomFieldValue(cfv.value, cfv.fieldType) ?? "—"}
                  />
                ))}
              </div>
            </DetailCard>
          )}

          {/* Notes */}
          {application.notes && (
            <DetailCard>
              <SectionHeader icon={StickyNote} title="Notes" />
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{application.notes}</p>
            </DetailCard>
          )}
        </div>

        {/* Right one-third: Timeline */}
        <div className="flex flex-col gap-6">
          <DetailCard
            className="flex flex-col overflow-hidden"
            style={{ maxHeight: detailsHeight ? `${detailsHeight}px` : undefined }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <History className="h-[18px] w-[18px] text-primary" />
                <h3 className="text-sm font-bold text-foreground">History</h3>
              </div>
              {hasMoreHistory && (
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setHistoryOpen(true)}
                  title="View full history"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <ApplicationHistoryTimeline
                history={history}
                isLoading={historyLoading}
              />
            </div>
          </DetailCard>
        </div>
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
