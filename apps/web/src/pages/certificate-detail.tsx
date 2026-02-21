import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Pencil, Info, History, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
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
import { AttachmentsSection } from "../components/shared/attachments-section";
import type { CertificateFormValues } from "../lib/schemas/certificate";

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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-muted flex items-center justify-center">
              <span className="text-lg font-bold text-muted-foreground">
                {certificate.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{certificate.name}</h1>
                <CertificateStatusBadge status={certificate.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {certificate.certificateTypeName}
                {certificate.issuer && ` · ${certificate.issuer}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setFormOpen(true)} className="font-semibold shadow-lg">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Details
            </Button>
          </div>
        </div>
        {/* Breadcrumbs */}
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <Link to="/certificates" className="hover:text-primary">Certificates</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{certificate.name}</span>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Certificate Details */}
        <section className="lg:col-span-2">
          <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b flex items-center">
              <h3 className="font-bold flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Certificate Details
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Name</p>
                  <p className="text-sm font-medium">{certificate.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Type</p>
                  <p className="text-sm font-medium">{certificate.certificateTypeName || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Issuer</p>
                  <p className="text-sm font-medium">{certificate.issuer || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Subject</p>
                  <p className="text-sm font-medium">{certificate.subject || "—"}</p>
                </div>
                {certificate.thumbprint && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Thumbprint</p>
                    <p className="text-sm font-medium font-mono text-xs">{certificate.thumbprint}</p>
                  </div>
                )}
                {certificate.serialNumber && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Serial Number</p>
                    <p className="text-sm font-medium font-mono text-xs">{certificate.serialNumber}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Issued Date</p>
                  <p className="text-sm font-medium">{formatDate(certificate.issuedDate) ?? "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Expiry Date</p>
                  <p className={`text-sm font-medium ${isExpired(certificate.expiryDate) ? "text-red-500 font-bold" : isExpiringSoon(certificate.expiryDate) ? "text-orange-500 font-bold" : ""}`}>
                    {formatDate(certificate.expiryDate) ?? "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Auto Renewal</p>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    {certificate.autoRenewal ? (
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
                  <p className="text-sm font-medium">{certificate.locationName || "—"}</p>
                </div>
                {certificate.assetName && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Linked Asset</p>
                    <p className="text-sm font-medium text-primary">{certificate.assetName}</p>
                  </div>
                )}
                {certificate.personName && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Managed By</p>
                    <p className="text-sm font-medium">{certificate.personName}</p>
                  </div>
                )}
              </div>

              {/* Custom Fields */}
              {certificate.customFieldValues && certificate.customFieldValues.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Custom Fields</p>
                  <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                    {certificate.customFieldValues.map((cfv) => (
                      <div key={cfv.fieldDefinitionId} className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{cfv.fieldName}</p>
                        <p className="text-sm font-medium">{formatCustomFieldValue(cfv.value, cfv.fieldType) ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {certificate.notes && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{certificate.notes}</p>
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
            </div>
          </div>
        </section>
      </div>

      {/* Attachments */}
      <AttachmentsSection entityType="Certificate" entityId={certificate.id} />

      {/* Dialogs */}
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
