import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { CertificateStatusBadge } from "../components/certificates/certificate-status-badge";
import { CertificateHistoryTimeline } from "../components/certificates/certificate-history-timeline";
import { CertificateHistoryDialog } from "../components/certificates/certificate-history-dialog";
import { CertificateFormDialog } from "../components/certificates/certificate-form-dialog";
import {
  useCertificate,
  useCertificateHistory,
  useUpdateCertificate,
} from "../hooks/use-certificates";
import { useCertificateTypes } from "../hooks/use-certificate-types";
import { useLocations } from "../hooks/use-locations";
import type { CertificateFormValues } from "../lib/schemas/certificate";

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

export default function CertificateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: certificate, isLoading, isError } = useCertificate(id!);
  const { data: history, isLoading: historyLoading } = useCertificateHistory(id!, HISTORY_PREVIEW_LIMIT);
  const { data: certificateTypes } = useCertificateTypes();
  const { data: locations } = useLocations();
  const updateMutation = useUpdateCertificate();

  const [formOpen, setFormOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  function handleFormSubmit(values: CertificateFormValues) {
    if (!certificate) return;

    const customFieldValues = Object.entries(values.customFieldValues ?? {})
      .filter(([, v]) => v != null && v !== "" && v !== "__none__")
      .map(([fieldDefinitionId, value]) => ({
        fieldDefinitionId,
        value: value!,
      }));

    const data = {
      name: values.name,
      certificateTypeId: values.certificateTypeId,
      issuer: values.issuer || null,
      subject: values.subject || null,
      thumbprint: values.thumbprint || null,
      serialNumber: values.serialNumber || null,
      issuedDate: values.issuedDate ? `${values.issuedDate}T00:00:00Z` : null,
      expiryDate: values.expiryDate ? `${values.expiryDate}T00:00:00Z` : null,
      status: values.status || "Active",
      autoRenewal: values.autoRenewal ?? false,
      notes: values.notes || null,
      assetId: values.assetId && values.assetId !== "none" ? values.assetId : null,
      personId: values.personId && values.personId !== "none" ? values.personId : null,
      locationId: values.locationId && values.locationId !== "none" ? values.locationId : null,
      customFieldValues,
    };

    updateMutation.mutate(
      { id: certificate.id, data },
      {
        onSuccess: () => {
          toast.success("Certificate updated");
          setFormOpen(false);
        },
        onError: () => {
          toast.error("Failed to update certificate");
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

  if (isError || !certificate) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/certificates")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Certificates
        </Button>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Certificate not found or failed to load.
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/certificates")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {certificate.name}
              </h1>
              <CertificateStatusBadge status={certificate.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {certificate.certificateTypeName}
            </p>
          </div>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Details card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <InfoItem label="Name" value={certificate.name} />
              <InfoItem label="Type" value={certificate.certificateTypeName} />
              <InfoItem label="Issuer" value={certificate.issuer} />
              <InfoItem label="Subject" value={certificate.subject} />
              <InfoItem label="Thumbprint" value={certificate.thumbprint} />
              <InfoItem label="Serial Number" value={certificate.serialNumber} />
              <InfoItem label="Issued Date" value={formatDate(certificate.issuedDate)} />
              <InfoItem label="Expiry Date" value={formatDate(certificate.expiryDate)} />
              <InfoItem label="Status" value={certificate.status} />
              <InfoItem label="Auto Renewal" value={certificate.autoRenewal ? "Yes" : "No"} />
              <InfoItem label="Location" value={certificate.locationName} />
              <InfoItem label="Asset" value={certificate.assetName} />
              <InfoItem label="Person" value={certificate.personName} />
            </dl>
            {certificate.customFieldValues && certificate.customFieldValues.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">Custom Fields</p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {certificate.customFieldValues.map((cfv) => (
                    <InfoItem
                      key={cfv.fieldDefinitionId}
                      label={cfv.fieldName}
                      value={formatCustomFieldValue(cfv.value, cfv.fieldType)}
                    />
                  ))}
                </dl>
              </div>
            )}
            {certificate.notes && (
              <div className="mt-4 pt-4 border-t">
                <dt className="text-sm text-muted-foreground">Notes</dt>
                <dd className="text-sm mt-0.5 whitespace-pre-wrap">{certificate.notes}</dd>
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
            <CertificateHistoryTimeline
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

      <CertificateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        certificate={certificate}
        certificateTypes={certificateTypes ?? []}
        locations={locations ?? []}
        onSubmit={handleFormSubmit}
        loading={updateMutation.isPending}
      />

      <CertificateHistoryDialog
        certificateId={certificate.id}
        certificateName={certificate.name}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}
