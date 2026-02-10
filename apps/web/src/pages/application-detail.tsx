import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Power, PowerOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
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
import type { ApplicationFormValues } from "../lib/schemas/application";

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5">{value || "—"}</dd>
    </div>
  );
}

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
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Applications
        </Button>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Application not found or failed to load.
        </div>
      </div>
    );
  }

  const hasMoreHistory = history && history.length >= HISTORY_PREVIEW_LIMIT;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/applications")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {application.name}
              </h1>
              <ApplicationStatusBadge status={application.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {application.applicationTypeName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {application.status !== "Inactive" && !application.isArchived && (
            <Button variant="destructive" onClick={() => setDeactivateOpen(true)}>
              <PowerOff className="mr-2 h-4 w-4" />
              Deactivate
            </Button>
          )}
          {application.status === "Inactive" && !application.isArchived && (
            <Button
              variant="outline"
              onClick={handleReactivate}
              disabled={reactivateMutation.isPending}
            >
              <Power className="mr-2 h-4 w-4" />
              {reactivateMutation.isPending ? "Reactivating..." : "Reactivate"}
            </Button>
          )}
          <Button onClick={() => setFormOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Details card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <InfoItem label="Name" value={application.name} />
              <InfoItem label="Type" value={application.applicationTypeName} />
              <InfoItem label="Publisher" value={application.publisher} />
              <InfoItem label="Version" value={application.version} />
              <InfoItem label="Licence Type" value={application.licenceType} />
              <InfoItem label="Licence Key" value={application.licenceKey} />
              <InfoItem label="Max Seats" value={application.maxSeats?.toString()} />
              <InfoItem label="Used Seats" value={application.usedSeats?.toString()} />
              <InfoItem label="Purchase Date" value={formatDate(application.purchaseDate)} />
              <InfoItem label="Expiry Date" value={formatDate(application.expiryDate)} />
              <InfoItem label="Purchase Cost" value={formatCurrency(application.purchaseCost)} />
              <InfoItem label="Auto Renewal" value={application.autoRenewal ? "Yes" : "No"} />
              <InfoItem label="Location" value={application.locationName} />
              <InfoItem label="Asset" value={application.assetName} />
              <InfoItem label="Person" value={application.personName} />
            </dl>
            {application.customFieldValues && application.customFieldValues.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">Custom Fields</p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {application.customFieldValues.map((cfv) => (
                    <InfoItem
                      key={cfv.fieldDefinitionId}
                      label={cfv.fieldName}
                      value={formatCustomFieldValue(cfv.value, cfv.fieldType)}
                    />
                  ))}
                </dl>
              </div>
            )}
            {application.notes && (
              <div className="mt-4 pt-4 border-t">
                <dt className="text-sm text-muted-foreground">Notes</dt>
                <dd className="text-sm mt-0.5 whitespace-pre-wrap">{application.notes}</dd>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History card */}
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

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
